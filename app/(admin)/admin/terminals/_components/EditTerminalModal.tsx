"use client";

import { useState, useTransition, useRef } from "react";
import { X } from "lucide-react";
import { editTerminal } from "@/app/(admin)/admin/_actions/terminals";

export type TerminalEditData = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  is_active: boolean;
};

interface Props {
  terminal: TerminalEditData;
  onClose: () => void;
}

export default function EditTerminalModal({ terminal, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState(terminal.lat.toString());
  const [lng, setLng] = useState(terminal.lng.toString());
  const [isActive, setIsActive] = useState(terminal.is_active);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await editTerminal(terminal.id, {
        name: (fd.get("name") as string) ?? "",
        city: (fd.get("city") as string) ?? "",
        lat,
        lng,
        is_active: isActive,
      });
      if ("error" in res) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-base font-semibold">Edit Terminal</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Update terminal details.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors mt-0.5"
          >
            <X size={15} />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Terminal Name</label>
            <input
              name="name"
              required
              defaultValue={terminal.name}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">City / Area</label>
            <input
              name="city"
              required
              defaultValue={terminal.city}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Latitude</label>
              <input
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Longitude</label>
              <input
                type="number"
                step="any"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => setIsActive((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                isActive ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-xs font-medium">
              {isActive ? "Active" : "Inactive"}
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
