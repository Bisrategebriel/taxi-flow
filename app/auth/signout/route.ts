// FR-AU-05 — legacy POST endpoint kept for any direct-POST callers
// Dashboard forms now use the signout Server Action in actions.ts instead.
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/auth/login', request.url), { status: 303 });
}
