"use client";

import { useActionState } from "react";
import type { RouteFormState } from "@/app/(admin)/admin/_actions/routes";

interface Terminal {
  id: string;
  name: string;
  city: string;
}

interface RouteFormProps {
  action: (prev: RouteFormState, formData: FormData) => Promise<RouteFormState>;
  terminals: Terminal[];
  defaultValues?: {
    name?: string;
    start_terminal_id?: string;
    end_terminal_id?: string;
    is_active?: boolean;
  };
  submitLabel: string;
}

export default function RouteForm({ action, terminals, defaultValues, submitLabel }: RouteFormProps) {
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
        <label className="text-sm font-medium" htmlFor="start_terminal_id">Start Terminal *</label>
        <select
          id="start_terminal_id" name="start_terminal_id" required
          defaultValue={defaultValues?.start_terminal_id}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select start terminal</option>
          {terminals.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.city})
            </option>
          ))}
        </select>
        {state.errors?.start_terminal_id && (
          <p className="text-xs text-destructive">{state.errors.start_terminal_id[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="end_terminal_id">End Terminal *</label>
        <select
          id="end_terminal_id" name="end_terminal_id" required
          defaultValue={defaultValues?.end_terminal_id}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select end terminal</option>
          {terminals.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.city})
            </option>
          ))}
        </select>
        {state.errors?.end_terminal_id && (
          <p className="text-xs text-destructive">{state.errors.end_terminal_id[0]}</p>
        )}
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
          href="/admin/routes"
          className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
