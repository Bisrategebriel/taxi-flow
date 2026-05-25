// FR-AU-05
'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Clear proxy cookies set at login time.
  const cookieStore = await cookies();
  cookieStore.delete('tf_role');

  redirect('/auth/login');
}
