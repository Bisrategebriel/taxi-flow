"use client";

// FR-EC-03
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  new_data: unknown;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: "text-green-400 bg-green-500/10 border-green-500/30",
  UPDATE: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  DELETE: "text-red-400 bg-red-500/10 border-red-500/30",
  EMERGENCY_STOP: "text-red-400 bg-red-500/10 border-red-500/30",
  FORCE_LOGOUT_ALL: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  ANNOUNCEMENT_SET: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  ANNOUNCEMENT_CLEARED: "text-muted-foreground bg-muted border-border",
  LOGIN_DISABLED: "text-red-400 bg-red-500/10 border-red-500/30",
  LOGIN_ENABLED: "text-green-400 bg-green-500/10 border-green-500/30",
  NON_CRITICAL_DATA_RESET: "text-orange-400 bg-orange-500/10 border-orange-500/30",
};

function ActionBadge({ action }: { action: string }) {
  const cls =
    ACTION_COLORS[action] ?? "text-muted-foreground bg-muted border-border";
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {action}
    </span>
  );
}

export default function AuditLogsView({
  logs,
  totalPages,
  currentPage,
  filterAction,
  filterTable,
}: {
  logs: AuditLog[];
  totalPages: number;
  currentPage: number;
  filterAction: string;
  filterTable: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [localAction, setLocalAction] = useState(filterAction);
  const [localTable, setLocalTable] = useState(filterTable);

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    if (localAction) params.set("action", localAction);
    else params.delete("action");
    if (localTable) params.set("table", localTable);
    else params.delete("table");
    params.set("page", "1");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Filter by action…"
            value={localAction}
            onChange={(e) => setLocalAction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="pl-8 pr-3 h-8 w-48 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by table…"
          value={localTable}
          onChange={(e) => setLocalTable(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          className="px-3 h-8 w-40 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={applyFilters}
          className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Table
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Record
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-xs text-muted-foreground"
                  >
                    No audit events found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {(log.profiles as { full_name: string | null } | null)
                        ?.full_name ??
                        log.actor_id?.slice(0, 8) ??
                        "system"}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.table_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {log.record_id ? log.record_id.slice(0, 8) + "…" : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted disabled:opacity-40 hover:bg-accent"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted disabled:opacity-40 hover:bg-accent"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
