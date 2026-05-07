// FR-AU-02
'use server';

import { createClient } from '@/lib/supabase/server';

export type RegisterState =
  | { errors?: { fullName?: string[]; email?: string[]; password?: string[] }; success?: boolean }
  | undefined;

export async function register(
  _state: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  const errors: NonNullable<RegisterState>['errors'] = {};

  if (!fullName || fullName.length < 2) {
    errors.fullName = ['Name must be at least 2 characters.'];
  }
  if (!email) {
    errors.email = ['Email is required.'];
  }
  if (!password || password.length < 8) {
    errors.password = ['Password must be at least 8 characters.'];
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { errors: { email: [error.message] } };
  }

  return { success: true };
}
