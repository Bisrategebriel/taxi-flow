"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground max-w-sm">
        An unexpected error occurred. Please try again or return to the home
        page.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
        <a
          href="/"
          className="h-9 rounded-lg border border-border bg-muted px-4 text-sm font-medium leading-9"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
