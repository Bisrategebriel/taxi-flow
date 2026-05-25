"use client";

import { useState, useTransition } from "react";
import { Plus, X, MapPin } from "lucide-react";
import { editRoute } from "@/app/(admin)/admin/_actions/routes";
import type { TerminalOption } from "./AddRouteModal";

export type RouteEditData = {
  id: string;
  name: string;
  start_terminal_id: string;
  end_terminal_id: string;
  via_ids: string[];
  distance_km: number | null;
  fare_etb: number | null;
  fareId: string | null;
  is_active: boolean;
};

interface Props {
  route: RouteEditData;
  terminals: TerminalOption[];
  onClose: () => void;
}

export default function EditRouteModal({ route, terminals, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [fromId, setFromId] = useState(route.start_terminal_id);
  const [toId, setToId] = useState(route.end_terminal_id);
  const [viaIds, setViaIds] = useState<string[]>(route.via_ids);
  const [distKm, setDistKm] = useState(route.distance_km?.toString() ?? "");
  const [fareEtb, setFareEtb] = useState(route.fare_etb?.toString() ?? "");
  const [isActive, setIsActive] = useState(route.is_active);
  const [pending, startTransition] = useTransition();

  const fromName = terminals.find((t) => t.id === fromId)?.name ?? "";
  const toName = terminals.find((t) => t.id === toId)?.name ?? "";
  const viaNames = viaIds
    .map((id) => terminals.find((t) => t.id === id)?.name)
    .filter(Boolean) as string[];
  const pathParts = [fromName, ...viaNames, toName].filter(Boolean);

  function addViaStop() {
    setViaIds((prev) => [...prev, ""]);
  }

  function updateViaStop(index: number, value: string) {
    setViaIds((prev) => prev.map((id, i) => (i === index ? value : id)));
  }

  function removeViaStop(index: number) {
    setViaIds((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await editRoute(route.id, {
        name: (fd.get("name") as string) ?? "",
        start_terminal_id: fromId,
        end_terminal_id: toId,
        via_ids: viaIds.filter(Boolean),
        distance_km: distKm,
        fare_etb: fareEtb,
        is_active: isActive,
        fareId: route.fareId,
      });
      if ("error" in res) { setError(res.error); }
      else { onClose(); }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold">Edit Route</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Configure route between two terminals.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors mt-0.5">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 overflow-y-auto">
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

          {/* Route Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Route Name</label>
            <input name="name" required defaultValue={route.name}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          {/* From Terminal */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">From Terminal</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} required
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Select start terminal</option>
              {terminals.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.city})</option>)}
            </select>
          </div>

          {/* Via Terminals */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Via Terminals <span className="text-muted-foreground font-normal">(optional)</span></label>
              <button
                type="button"
                onClick={addViaStop}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Plus size={12} /> Add stop
              </button>
            </div>
            {viaIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">No intermediate stops</p>
            ) : (
              <div className="space-y-2">
                {viaIds.map((vid, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={vid}
                      onChange={(e) => updateViaStop(i, e.target.value)}
                      className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select terminal</option>
                      {terminals.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeViaStop(i)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* To Terminal */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">To Terminal</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} required
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Select end terminal</option>
              {terminals.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.city})</option>)}
            </select>
          </div>

          {/* Distance */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Distance (km)</label>
            <input value={distKm} onChange={(e) => setDistKm(e.target.value)} name="distance_km" type="number" step="any" min="0" placeholder="e.g. 24"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          {/* Fare ETB */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Fare (ETB)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">ETB</span>
              <input value={fareEtb} onChange={(e) => setFareEtb(e.target.value)} name="fare_etb" type="number" step="0.01" min="0" placeholder="0.00"
                className="h-10 w-full rounded-lg border border-border bg-background pl-12 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>

          {/* Route path preview */}
          {pathParts.length >= 2 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-3 py-2.5 text-xs text-primary flex-wrap">
              <MapPin size={11} />
              {pathParts.map((p, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-primary/60">→</span>}
                  <span className="font-medium">{p}</span>
                </span>
              ))}
            </div>
          )}

          {/* Active toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div onClick={() => setIsActive((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-xs font-medium">{isActive ? "Active" : "Inactive"}</span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={pending}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
