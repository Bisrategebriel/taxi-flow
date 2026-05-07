// FR-AU-05 — admin dashboard placeholder (full implementation in Phase 8)
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signout } from '@/app/auth/signout/actions';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        <p className="mt-1 text-xs text-blue-600 font-medium uppercase tracking-wide">
          {profile?.role}
        </p>
        <p className="mt-4 text-sm text-gray-600">
          Admin dashboard — full implementation coming in Phase 8.
        </p>
        <form action={signout} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
