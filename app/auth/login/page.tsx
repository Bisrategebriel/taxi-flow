// FR-AU-01
'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { login, type LoginState } from './actions';

const bgStyle = {
  background:
    'radial-gradient(ellipse 80% 60% at 30% 20%, oklch(0.18 0.07 242 / 0.7), transparent 60%), radial-gradient(ellipse 60% 50% at 70% 80%, oklch(0.14 0.05 260 / 0.5), transparent 55%), oklch(0.1 0.015 242)',
};

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

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
            <h2 className="text-xl font-semibold text-white">Sign in</h2>
            <p className="mt-1 text-sm text-white/45">Enter your credentials to continue</p>
          </div>

          <form action={action} className="space-y-4">
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
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-white/80">
                  Password
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
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
              {pending ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/40">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
