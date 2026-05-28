// FR-AU-03
'use client';

import { useActionState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { resetPassword, type ResetState } from './actions';

const bgStyle = {
  background:
    'radial-gradient(ellipse 80% 60% at 30% 20%, oklch(0.18 0.07 242 / 0.7), transparent 60%), radial-gradient(ellipse 60% 50% at 70% 80%, oklch(0.14 0.05 260 / 0.5), transparent 55%), oklch(0.1 0.015 242)',
};

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, undefined);

  if (state?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={bgStyle}>
        <div className="w-full max-w-sm text-center">
          <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Mail size={22} />
            </div>
            <h2 className="text-xl font-semibold text-white">Check your inbox</h2>
            <p className="mt-2 text-sm text-white/50">
              We&apos;ve sent a password reset link to your email address.
            </p>
            <Link
              href="/auth/login"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={bgStyle}>
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/taxiflow-logo2.png"
            alt="TaxiFlow"
            width={56}
            height={56}
            className="rounded-2xl shadow-lg"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">TaxiFlow</h1>
            <p className="mt-0.5 text-sm text-white/50">Navigate smarter, travel faster</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">Reset password</h2>
            <p className="mt-1 text-sm text-white/45">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-white/80">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@example.com"
                className="h-10 w-full rounded-lg border border-white/[0.12] bg-white/[0.07] px-3 text-sm text-white placeholder:text-white/25 transition-all outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {state?.error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
            >
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/45 transition-colors hover:text-white/70"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
