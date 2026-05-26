"use client";

import { useState, useTransition } from "react";
import { X, User, Clock, MapPin, CreditCard, Navigation, Ban } from "lucide-react";
import { cancelTrip } from "@/app/(admin)/admin/_actions/trips";
import type { TripRow } from "../page";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function computeDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:          "border border-blue-500/60 text-blue-400 bg-blue-500/10",
    completed:       "border border-green-500/60 text-green-400 bg-green-500/10",
    paid:            "border border-green-500/60 text-green-400 bg-green-500/10",
    payment_pending: "border border-amber-500/60 text-amber-400 bg-amber-500/10",
    cancelled:       "border border-red-500/60 text-red-400 bg-red-500/10",
  };
  const label: Record<string, string> = {
    active: "Active",
    completed: "Completed",
    paid: "Paid",
    payment_pending: "Payment Pending",
    cancelled: "Cancelled",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[status] ?? "border border-border text-muted-foreground"}`}>
      {label[status] ?? status}
    </span>
  );
}

interface InfoCellProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}
function InfoCell({ icon, label, value }: InfoCellProps) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-4 py-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

interface Props {
  trip: TripRow;
  onClose: () => void;
  onCancelled?: (tripId: string) => void;
}

export default function TripDetailModal({ trip, onClose, onCancelled }: Props) {
  const isCompleted = ["completed", "paid", "payment_pending"].includes(trip.status);
  const [currentStatus, setCurrentStatus] = useState(trip.status);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelPending, startCancel] = useTransition();

  function handleCancelConfirm() {
    setCancelError(null);
    startCancel(async () => {
      const res = await cancelTrip(trip.id);
      if (res.error) {
        setCancelError(res.error);
      } else {
        setCurrentStatus("cancelled");
        setShowConfirm(false);
        onCancelled?.(trip.id);
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
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Navigation size={15} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Trip {trip.displayId}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full trip details and route information.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Route card */}
          <div className="rounded-xl border border-border bg-background/50 px-4 py-4">
            <div className="flex items-stretch gap-4">
              <div className="flex flex-col items-center pt-0.5">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <div className="my-1.5 flex-1 w-px bg-border min-h-7" />
                <div className="h-3 w-3 rounded-full border-2 border-primary bg-transparent" />
              </div>
              <div className="flex flex-col justify-between gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">From</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {trip.startTerminalName ?? trip.routeName?.split("→")[0]?.trim() ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">To</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {trip.endTerminalName ?? trip.routeName?.split("→")[1]?.trim() ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2">
            <InfoCell icon={<User size={13} />} label="Passenger" value={trip.passengerName ?? "—"} />
            <InfoCell icon={<User size={13} />} label="Driver" value="—" />
            <InfoCell icon={<Clock size={13} />} label="Started" value={formatTime(trip.startedAt)} />
            <InfoCell icon={<Clock size={13} />} label="Duration" value={computeDuration(trip.startedAt, trip.endedAt)} />
            <InfoCell icon={<MapPin size={13} />} label="Distance" value={trip.distanceKm != null ? `${trip.distanceKm} km` : "—"} />
            <InfoCell icon={<CreditCard size={13} />} label="Fare" value={trip.fareAmount != null ? `ETB ${trip.fareAmount.toFixed(2)}` : "—"} />
            {isCompleted && trip.endedAt && (
              <InfoCell icon={<Clock size={13} />} label="Ended" value={formatTime(trip.endedAt)} />
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3">
            <span className="text-xs text-muted-foreground font-medium">Status</span>
            <StatusBadge status={currentStatus} />
          </div>

          {/* Cancel trip — only for active trips */}
          {currentStatus === "active" && !showConfirm && (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="flex w-full items-center justify-center gap-2 h-10 rounded-xl border border-red-500/40 text-red-500 bg-red-500/5 hover:bg-red-500/10 text-sm font-medium transition-colors"
            >
              <Ban size={15} />
              Cancel Trip
            </button>
          )}

          {/* Confirmation panel */}
          {showConfirm && currentStatus === "active" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-4 space-y-3">
              <p className="text-sm font-medium text-red-500">Cancel this trip?</p>
              <p className="text-xs text-muted-foreground">
                The trip will be marked as cancelled and the passenger will be notified.
              </p>
              {cancelError && (
                <p className="text-xs text-destructive">{cancelError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowConfirm(false); setCancelError(null); }}
                  disabled={cancelPending}
                  className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Keep Trip
                </button>
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  disabled={cancelPending}
                  className="flex-1 h-9 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  {cancelPending ? "Cancelling…" : "Yes, Cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
