"use client";

import { useState } from "react";
import { MapPin, Search, Pencil, Route, ChevronLeft, ChevronRight } from "lucide-react";
import ToggleActiveButton from "./ToggleActiveButton";
import EditTerminalModal, { type TerminalEditData } from "./EditTerminalModal";

const ALLOWED_PAGE_SIZES = [5, 10, 25, 50] as const;
type PageSize = (typeof ALLOWED_PAGE_SIZES)[number];
const DEFAULT_PAGE_SIZE: PageSize = 10;

export type TerminalItem = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  is_active: boolean;
  routeCount: number;
};

export default function TerminalListPanel({ terminals }: { terminals: TerminalItem[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<TerminalEditData | null>(null);

  const filtered = search
    ? terminals.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.city.toLowerCase().includes(search.toLowerCase())
      )
    : terminals;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search terminals…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {visible.map((t, i) => (
            <div
              key={t.id}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors ${
                i < visible.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {/* Icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MapPin size={16} className="text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground leading-snug">{t.name}</p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      t.is_active
                        ? "border-green-500/60 text-green-600 bg-green-500/10 dark:text-green-400"
                        : "border-border text-muted-foreground bg-muted/30"
                    }`}
                  >
                    {t.is_active ? "active" : "inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">{t.city}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Route size={11} />
                    {t.routeCount} route{t.routeCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <ToggleActiveButton id={t.id} isActive={t.is_active} />
                <button
                  type="button"
                  onClick={() => setEditing({ id: t.id, name: t.name, city: t.city, lat: t.lat, lng: t.lng, is_active: t.is_active })}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Edit terminal"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          ))}

          {visible.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {search ? "No terminals match your search." : "No terminals added yet."}
            </div>
          )}
        </div>

        {/* Pagination + rows-per-page */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as PageSize);
                setPage(1);
              }}
              className="h-7 rounded-md border border-border bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {ALLOWED_PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="tabular-nums">
              {filtered.length === 0
                ? "0"
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}`
              } of {filtered.length}
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs tabular-nums">{currentPage} / {totalPages}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditTerminalModal
          terminal={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
