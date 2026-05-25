// FR-AU-05, FR-SS-01
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Must reassign to carry updated Set-Cookie headers back to the browser
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() contacts the Auth server to refresh the session token if needed.
  // Do NOT use getSession() here — it reads unverified cookie data.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/track/') ||
    pathname.startsWith('/api/webhooks/');

  const isAuthPath = pathname.startsWith('/auth/');
  const isAdminPath = pathname.startsWith('/admin/');
  const isMaintenancePage = pathname === '/maintenance';

  // Maintenance mode: tf_maintenance cookie is set/cleared by the toggleSetting
  // Server Action — avoids a DB call in the proxy for every request.
  const isMaintenance = request.cookies.get('tf_maintenance')?.value === '1';
  if (isMaintenance && !isAdminPath && !isAuthPath && !isMaintenancePage && !isPublic) {
    // tf_role cookie is set at login; admins bypass the maintenance gate.
    const role = request.cookies.get('tf_role')?.value;
    const isAdmin = role === 'admin' || role === 'super_admin';
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages to their dashboard
  if (user && isAuthPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role ?? 'user';
    const dest = role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/dashboard';
    const url = request.nextUrl.clone();
    url.pathname = dest;
    return NextResponse.redirect(url);
  }

  // Unauthenticated — redirect to login unless on a public or auth path
  if (!user && !isPublic && !isAuthPath && !isMaintenancePage) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Admin paths: require admin or super_admin role
  if (user && isAdminPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
