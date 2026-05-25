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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (service as any)
    .from("audit_logs")
    .select(
      // profiles join via actor_id → auth.users → profiles.id (cross-schema FK,
      // not visible in generated types — using `any` cast is intentional here)
      "id, actor_id, action, table_name, record_id, new_data, created_at, profiles(full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.action) query = query.ilike("action", `%${params.action}%`);
  if (params.table) query = query.eq("table_name", params.table);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawLogs, count } = (await query) as any;
  const logs: AuditLog[] = rawLogs ?? [];
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
