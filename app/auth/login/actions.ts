// FR-AU-01, FR-AS-02
'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export type LoginState = { error?: string } | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  // FR-AS-02: check login_enabled before allowing sign-in
  const service = createServiceClient();
  const { data: loginSetting } = await service
    .from('system_settings')
    .select('value')
    .eq('key', 'login_enabled')
    .single();

  const loginEnabled =
    loginSetting?.value !== false && loginSetting?.value !== 'false';
  if (!loginEnabled) {
    return { error: 'Login is currently disabled. Please try again later.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const role = profile?.role ?? 'user';

  // Set tf_role cookie so proxy.ts can identify admins without a DB call.
  const cookieStore = await cookies();
  cookieStore.set('tf_role', role, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/dashboard');
}
