// FR-EC-03
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import AuditLogsView, { type AuditLog } from "./_components/AuditLogsView";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; table?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") redirect("/admin/dashboard");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const perPage = 50;
  const offset = (page - 1) * perPage;

  const service = createServiceClient();
  // Fetch audit_logs without a profiles join — audit_logs.actor_id references
  // auth.users, not profiles directly, so PostgREST can't resolve the relation.
  let query = service
    .from("audit_logs")
    .select("id, actor_id, action, table_name, record_id, new_data, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.action) query = query.ilike("action", `%${params.action}%`);
  if (params.table) query = query.eq("table_name", params.table);

  const { data: rawLogs, count } = await query;

  // Resolve actor names separately: collect unique non-null actor_ids, then
  // fetch their full_name from profiles in one query.
  const actorIds = [
    ...new Set((rawLogs ?? []).map((l) => l.actor_id).filter(Boolean)),
  ] as string[];

  const actorNames: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      if (p.full_name) actorNames[p.id] = p.full_name;
    }
  }

  const logs: AuditLog[] = (rawLogs ?? []).map((l) => ({
    ...l,
    actor_name: l.actor_id ? (actorNames[l.actor_id] ?? null) : null,
  }));

  const totalPages = Math.ceil((count ?? 0) / perPage);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          All Super Admin and system events — read-only
        </p>
      </div>
      <AuditLogsView
        logs={logs ?? []}
        totalPages={totalPages}
        currentPage={page}
        filterAction={params.action ?? ""}
        filterTable={params.table ?? ""}
      />
    </div>
  );
}
