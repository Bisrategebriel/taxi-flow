// FR-AU-02
'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { register, type RegisterState } from './actions';

const bgStyle = {
  background:
    'radial-gradient(ellipse 80% 60% at 30% 20%, oklch(0.18 0.07 242 / 0.7), transparent 60%), radial-gradient(ellipse 60% 50% at 70% 80%, oklch(0.14 0.05 260 / 0.5), transparent 55%), oklch(0.1 0.015 242)',
};

export default function RegisterPage() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (state?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={bgStyle}>
        <div className="w-full max-w-sm text-center">
          <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 text-green-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Check your email</h2>
            <p className="mt-2 text-sm text-white/50">
              We&apos;ve sent a confirmation link to your email. Click it to activate your account.
            </p>
            <Link
              href="/auth/login"
              className="mt-5 inline-block text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
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
            <p className="mt-0.5 text-sm text-white/50">Create your account</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">Get started</h2>
            <p className="mt-1 text-sm text-white/45">Create your free TaxiFlow account</p>
          </div>

          <form action={action} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-sm font-semibold text-white/80">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                placeholder="John Doe"
                className="h-10 w-full rounded-lg border border-white/[0.12] bg-white/[0.07] px-3 text-sm text-white placeholder:text-white/25 transition-all outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
              />
              {state?.errors?.fullName && (
                <p className="text-xs text-red-400">{state.errors.fullName[0]}</p>
              )}
            </div>

            {/* Email */}
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
              {state?.errors?.email && (
                <p className="text-xs text-red-400">{state.errors.email[0]}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-sm font-semibold text-white/80">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+233 24 000 0000"
                className="h-10 w-full rounded-lg border border-white/[0.12] bg-white/[0.07] px-3 text-sm text-white placeholder:text-white/25 transition-all outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
              />
              {state?.errors?.phone && (
                <p className="text-xs text-red-400">{state.errors.phone[0]}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-white/80">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="h-10 w-full rounded-lg border border-white/[0.12] bg-white/[0.07] pl-3 pr-10 text-sm text-white placeholder:text-white/25 transition-all outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/65"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {state?.errors?.password && (
                <p className="text-xs text-red-400">{state.errors.password[0]}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white/80">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Repeat password"
                  className="h-10 w-full rounded-lg border border-white/[0.12] bg-white/[0.07] pl-3 pr-10 text-sm text-white placeholder:text-white/25 transition-all outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/65"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {state?.errors?.confirmPassword && (
                <p className="text-xs text-red-400">{state.errors.confirmPassword[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-1 h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
            >
              {pending ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-white/40">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-white/25">
            By continuing, you agree to our{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-white/50 transition-colors">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-white/50 transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
