import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Suspense } from "react";
import UserActions from "./_components/UserActions";
import AddUserModal from "./_components/AddUserModal";
import ImportUsersButton from "./_components/ImportUsersButton";
import ExportButton from "./_components/ExportButton";
import UsersToolbar from "./_components/UsersToolbar";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function userRef(id: string) {
  const hex = id.replace(/-/g, "").slice(-4);
  return `#UID-${(parseInt(hex, 16) % 10000).toString().padStart(4, "0")}`;
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];
function avatarColor(id: string) {
  const n = parseInt(id.replace(/-/g, "").slice(0, 8), 16);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ─── page ────────────────────────────────────────────────────────────────── */

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const { search, status } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: viewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const service = createServiceClient();

  let query = service
    .from("profiles")
    .select("id, full_name, role, is_suspended, created_at, phone")
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("full_name", `%${search}%`);

  const [{ data: profiles }, authList, { data: tripRows }] = await Promise.all([
    query,
    service.auth.admin.listUsers({ perPage: 1000 }),
    service.from("trips").select("user_id"),
  ]);

  /* ── merge auth + profile data ─────────────────────────────────────────── */
  const emailMap = new Map(
    (authList.data?.users ?? []).map((u) => [
      u.id,
      { email: u.email ?? "", confirmed: !!u.email_confirmed_at },
    ])
  );

  const tripCounts: Record<string, number> = {};
  for (const t of tripRows ?? []) {
    tripCounts[t.user_id] = (tripCounts[t.user_id] ?? 0) + 1;
  }

  type UserRow = {
    id: string;
    full_name: string | null;
    role: string;
    is_suspended: boolean;
    created_at: string;
    phone: string | null;
    email: string;
    status: "active" | "suspended" | "pending";
    trips: number;
  };

  const allRows: UserRow[] = (profiles ?? []).map((p) => {
    const auth = emailMap.get(p.id);
    const computedStatus: UserRow["status"] = p.is_suspended
      ? "suspended"
      : !auth?.confirmed
      ? "pending"
      : "active";
    return {
      ...p,
      email: auth?.email ?? "",
      status: computedStatus,
      trips: tripCounts[p.id] ?? 0,
    };
  });

  const filtered =
    status && status !== "all"
      ? allRows.filter((r) => r.status === status)
      : allRows;

  /* ── status badge ──────────────────────────────────────────────────────── */
  function statusClass(s: UserRow["status"]) {
    if (s === "active")
      return "border border-green-500/60 text-green-600 bg-green-500/10 dark:text-green-400";
    if (s === "suspended")
      return "border border-red-500/60 text-red-600 bg-red-500/10 dark:text-red-400";
    return "border border-amber-500/60 text-amber-600 bg-amber-500/10 dark:text-amber-400";
  }

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allRows.length} total user{allRows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportUsersButton />
          <ExportButton />
          <AddUserModal viewerRole={viewer?.role ?? "admin"} />
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <Suspense>
        <UsersToolbar filteredCount={filtered.length} />
      </Suspense>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground">
                  User
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground">
                  Contact
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground">
                  Trips
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground">
                  Joined
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {/* User */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${avatarColor(row.id)}`}
                      >
                        {initials(row.full_name)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-snug">
                          {row.full_name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">{userRef(row.id)}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-4">
                    <p className="text-foreground">{row.email || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.phone ?? "—"}</p>
                  </td>

                  {/* Trips */}
                  <td className="px-5 py-4">
                    <span className="font-semibold">{row.trips}</span>
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                    {new Date(row.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <UserActions
                      userId={row.id}
                      isSuspended={row.is_suspended}
                      userRole={row.role}
                      viewerRole={viewer?.role ?? "admin"}
                    />
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
