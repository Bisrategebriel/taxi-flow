// FR-AU-02
'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export type RegisterState =
  | {
      errors?: {
        fullName?: string[];
        email?: string[];
        phone?: string[];
        password?: string[];
        confirmPassword?: string[];
      };
      success?: boolean;
    }
  | undefined;

export async function register(
  _state: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  const errors: NonNullable<RegisterState>['errors'] = {};

  if (!fullName || fullName.length < 2) {
    errors.fullName = ['Name must be at least 2 characters.'];
  }
  if (!email) {
    errors.email = ['Email is required.'];
  }
  if (phone && !/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
    errors.phone = ['Enter a valid phone number.'];
  }
  if (!password || password.length < 8) {
    errors.password = ['Password must be at least 8 characters.'];
  }
  if (password && confirmPassword && password !== confirmPassword) {
    errors.confirmPassword = ['Passwords do not match.'];
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { errors: { email: [error.message] } };
  }

  // Store phone on the profile row (trigger creates the row on auth.users insert)
  if (phone && data.user) {
    const service = createServiceClient();
    await service.from('profiles').update({ phone }).eq('id', data.user.id);
  }

  return { success: true };
}
