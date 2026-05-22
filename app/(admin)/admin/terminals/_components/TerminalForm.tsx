"use client";

import { useActionState } from "react";
import type { TerminalFormState } from "@/app/(admin)/admin/_actions/terminals";

interface TerminalFormProps {
  action: (prev: TerminalFormState, formData: FormData) => Promise<TerminalFormState>;
  defaultValues?: {
    name?: string;
    address?: string;
    city?: string;
    lat?: number;
    lng?: number;
    is_active?: boolean;
  };
  submitLabel: string;
}

export default function TerminalForm({ action, defaultValues, submitLabel }: TerminalFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      {state.message && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="name">Name *</label>
        <input
          id="name" name="name" required
          defaultValue={defaultValues?.name}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {state.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="address">Address</label>
        <input
          id="address" name="address"
          defaultValue={defaultValues?.address}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="city">City *</label>
        <input
          id="city" name="city" required
          defaultValue={defaultValues?.city}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {state.errors?.city && (
          <p className="text-xs text-destructive">{state.errors.city[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="lat">Latitude *</label>
          <input
            id="lat" name="lat" type="number" step="any" required
            defaultValue={defaultValues?.lat}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {state.errors?.lat && (
            <p className="text-xs text-destructive">{state.errors.lat[0]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="lng">Longitude *</label>
          <input
            id="lng" name="lng" type="number" step="any" required
            defaultValue={defaultValues?.lng}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {state.errors?.lng && (
            <p className="text-xs text-destructive">{state.errors.lng[0]}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_active" name="is_active" type="checkbox"
          defaultChecked={defaultValues?.is_active ?? true}
          className="rounded border-border"
        />
        <label className="text-sm font-medium" htmlFor="is_active">Active</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit" disabled={pending}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <a
          href="/admin/terminals"
          className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
