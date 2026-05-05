'use client';

import { FluentProvider, webLightTheme, Button } from '@fluentui/react-components';

export default function Home() {
  return (
    <FluentProvider theme={webLightTheme}>
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          TaxiFlow — Phase 0 Scaffold
        </h1>
        <p className="text-lg text-gray-600">
          Next.js 16 · React 19 · Tailwind 4 · Fluent UI v9
        </p>
        <Button appearance="primary" size="large">
          TaxiFlow Phase 0
        </Button>
      </main>
    </FluentProvider>
  );
}
