"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, Search, Download } from "lucide-react";
import { updateFareInline, exportFares } from "@/app/(admin)/admin/_actions/fares";
import type { FareRow } from "../page";
import ImportFaresButton from "./ImportFaresButton";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FaresView({ rows }: { rows: FareRow[] }) {
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDist, setEditDist] = useState("");
  const [editFare, setEditFare] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();
  const [exportPending, startExport] = useTransition();

  const filtered = rows.filter((r) =>
    r.routeName.toLowerCase().includes(filter.toLowerCase())
  );

  function startEdit(row: FareRow) {
    setEditingId(row.id);
    setEditDist(row.distanceKm?.toString() ?? "");
    setEditFare(row.amount.toString());
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setSaveError(null);
  }

  function handleSave(row: FareRow) {
    const amount = parseFloat(editFare);
    const distKm = parseFloat(editDist);
    if (isNaN(amount) || amount <= 0) {
      setSaveError("Enter a valid fare amount.");
      return;
    }
    startSave(async () => {
      const res = await updateFareInline({
        fareId: row.id,
        amount,
        startTerminalId: row.startTerminalId,
        endTerminalId: row.endTerminalId,
        distanceKm: isNaN(distKm) ? 0 : distKm,
      });
      if (res.error) {
        setSaveError(res.error);
      } else {
        setEditingId(null);
        setSaveError(null);
      }
    });
  }

  function handleExport() {
    startExport(async () => {
      const { csv } = await exportFares();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fares-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fares &amp; Distances</h1>
        <p className="text-sm text-muted-foreground mt-1">Click a row to edit inline</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Filter routes..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground whitespace-nowrap">
            {filtered.length} routes
          </span>
          <div className="flex-1" />
          <ImportFaresButton />
          <button
            type="button"
            onClick={handleExport}
            disabled={exportPending}
            className="flex items-center gap-1.5 h-9 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <Download size={14} />
            {exportPending ? "Exporting…" : "Export"}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Distance (km)</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fare (ETB)</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Updated</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{row.routeName}</td>

                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editDist}
                          onChange={(e) => setEditDist(e.target.value)}
                          className="w-24 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {row.distanceKm != null ? `${row.distanceKm} km` : "—"}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editFare}
                          onChange={(e) => setEditFare(e.target.value)}
                          className="w-28 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <span className="text-primary font-medium font-mono">
                          ETB {row.amount.toFixed(2)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {formatDate(row.lastUpdated)}
                    </td>

                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSave(row)}
                            disabled={savePending}
                            title="Save"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            title="Cancel"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(row)}
                          title="Edit"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    {filter ? "No routes match your filter." : "No fares configured."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {saveError && (
          <div className="px-4 py-2.5 border-t border-border bg-destructive/5">
            <p className="text-xs text-destructive">{saveError}</p>
          </div>
        )}

        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Click the edit icon on any row to modify fares and distances inline. Changes are highlighted until saved.
          </p>
        </div>
      </div>
    </div>
  );
}
