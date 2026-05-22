"use client";

import { useState, useActionState } from "react";
import { updateFare, type FareFormState } from "@/app/(admin)/admin/_actions/fares";
import { Pencil, X } from "lucide-react";

interface FareEditModalProps {
  fareId: string;
  routeName: string;
  currentAmount: number;
}

export default function FareEditModal({ fareId, routeName, currentAmount }: FareEditModalProps) {
  const [open, setOpen] = useState(false);

  const boundAction = updateFare.bind(null, fareId);
  const [state, formAction, pending] = useActionState<FareFormState, FormData>(boundAction, {});

  // Close modal on successful save (no error, not pending)
  const saved = !state.error && !pending;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil size={13} />
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-semibold mb-1">Edit Fare</h2>
            <p className="text-sm text-muted-foreground mb-4">{routeName}</p>

            <form
              action={(fd) => {
                formAction(fd);
              }}
              className="space-y-4"
            >
              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="amount">Amount (ETB) *</label>
                <input
                  id="amount" name="amount" type="number" step="0.01" min="0" required
                  defaultValue={currentAmount}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit" disabled={pending}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
              {saved && (
                <p className="text-sm text-green-600 text-center">Saved!</p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
