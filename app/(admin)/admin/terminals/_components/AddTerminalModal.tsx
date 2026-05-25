"use client";

import { useState, useTransition, useRef } from "react";
import { MapPin, X, Plus } from "lucide-react";
import { addTerminal } from "@/app/(admin)/admin/_actions/terminals";

export default function AddTerminalModal() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState("5.5713");
  const [lng, setLng] = useState("-0.2074");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const coordsValid = !isNaN(latNum) && !isNaN(lngNum);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addTerminal({
        name: (fd.get("name") as string) ?? "",
        city: (fd.get("city") as string) ?? "",
        lat: fd.get("lat") as string,
        lng: fd.get("lng") as string,
        is_active: true,
      });
      if ("error" in res) {
        setError(res.error);
      } else {
        formRef.current?.reset();
        setLat("5.5713");
        setLng("-0.2074");
        setOpen(false);
      }
    });
  }

  function handleOpen() {
    setError(null);
    setLat("5.5713");
    setLng("-0.2074");
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 h-9 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus size={15} />
        Add Terminal
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-base font-semibold">Add New Terminal</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add a new taxi terminal to the network.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
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
                  placeholder="e.g. Circle Interchange"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">City / Area</label>
                <input
                  name="city"
                  required
                  placeholder="e.g. Asylum Down"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Latitude</label>
                  <input
                    name="lat"
                    type="number"
                    step="any"
                    required
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="5.5713"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Longitude</label>
                  <input
                    name="lng"
                    type="number"
                    step="any"
                    required
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="-0.2074"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Map pin preview */}
              <div className="rounded-xl overflow-hidden border border-border" style={{ height: 130 }}>
                {coordsValid ? (
                  <div className="relative w-full h-full bg-[#e8f4e8] flex items-center justify-center">
                    {/* Simple coordinate display with pin */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border-2 border-primary/60">
                        <MapPin size={18} className="text-primary" fill="currentColor" fillOpacity={0.3} />
                      </div>
                      <div className="rounded-md bg-black/70 px-2.5 py-1 text-center">
                        <p className="text-[10px] text-white font-mono leading-tight">
                          {latNum.toFixed(4)}, {lngNum.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-[#e8f4e8] flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                    <MapPin size={20} className="text-primary/50" />
                    <p className="text-xs">Map pin preview</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {pending ? "Adding…" : "Add Terminal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
