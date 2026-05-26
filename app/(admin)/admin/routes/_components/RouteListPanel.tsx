"use client";

import { useState } from "react";
import { Route, Search, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import ToggleRouteButton from "./ToggleRouteButton";
import EditRouteModal, { type RouteEditData } from "./EditRouteModal";
import type { TerminalOption } from "./AddRouteModal";

export type RouteItem = {
  id: string;
  name: string;
  is_active: boolean;
  start_terminal_id: string;
  end_terminal_id: string;
  startName: string;
  endName: string;
  via: string;
  via_ids: string[];
  distance_km: number | null;
  duration_min: number | null;
  fare_etb: number | null;
  fareId: string | null;
};

interface Props {
  routes: RouteItem[];
  terminals: TerminalOption[];
}

const PAGE_SIZES = [10, 25, 50];

export default function RouteListPanel({ routes, terminals }: Props) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RouteEditData | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = search
    ? routes.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.startName.toLowerCase().includes(search.toLowerCase()) ||
          r.endName.toLowerCase().includes(search.toLowerCase())
      )
    : routes;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function openEdit(r: RouteItem) {
    setEditing({
      id: r.id, name: r.name,
      start_terminal_id: r.start_terminal_id,
      end_terminal_id: r.end_terminal_id,
      via_ids: r.via_ids,
      distance_km: r.distance_km,
      duration_min: r.duration_min,
      fare_etb: r.fare_etb,
      fareId: r.fareId,
      is_active: r.is_active,
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search routes…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <span>Rows:</span>
            {PAGE_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setPageSize(s); setPage(1); }}
                className={`h-7 w-9 rounded-md border text-xs transition-colors ${
                  pageSize === s
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {paged.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                i < paged.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {/* Icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Route size={16} className="text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground leading-snug truncate">{r.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs text-foreground/80">{r.startName}</span>
                  {r.via_ids.length > 0 && (
                    <>
                      <span className="text-xs text-primary">→</span>
                      <span className="text-xs text-muted-foreground">{r.via}</span>
                    </>
                  )}
                  <span className="text-xs text-primary">→</span>
                  <span className="text-xs text-primary font-medium">{r.endName}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {r.distance_km != null && (
                    <span className="text-xs text-muted-foreground">{r.distance_km} km</span>
                  )}
                  {r.duration_min != null && (
                    <span className="text-xs text-muted-foreground">
                      {r.distance_km != null ? "·" : ""} ~{r.duration_min} min
                    </span>
                  )}
                  {r.fare_etb != null && (
                    <span className="text-xs text-primary font-medium">
                      {(r.distance_km != null || r.duration_min != null) ? "·" : ""} ETB {r.fare_etb.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  r.is_active
                    ? "border-green-500/60 text-green-600 bg-green-500/10 dark:text-green-400"
                    : "border-border text-muted-foreground bg-muted/30"
                }`}>
                  {r.is_active ? "active" : "inactive"}
                </span>
                <ToggleRouteButton id={r.id} isActive={r.is_active} />
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Edit route"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          ))}

          {paged.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {search ? "No routes match your search." : "No routes configured yet."}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <EditRouteModal
          route={editing}
          terminals={terminals}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
