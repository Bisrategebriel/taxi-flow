// FR-AU-03
'use server';

import { createClient } from '@/lib/supabase/server';

export type ResetState =
  | { error?: string; success?: boolean }
  | undefined;

export async function resetPassword(
  _state: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = (formData.get('email') as string)?.trim();

  if (!email) {
    return { error: 'Email is required.' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
