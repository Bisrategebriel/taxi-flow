import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const [{ data: profile }, { data: trips }, { data: payments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name, phone, role, created_at, home_address, work_address, language_pref"
        )
        .eq("id", user.id)
        .single(),
      service
        .from("trips")
        .select("id, status, fare_amount, started_at, ended_at, start_terminal_id, end_terminal_id")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service.from("payments") as any)
        .select("amount, currency, status, payment_method, paid_at")
        .eq("user_id", user.id)
        .order("paid_at", { ascending: false }),
    ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      email_confirmed: !!user.email_confirmed_at,
      created_at: user.created_at,
      ...profile,
    },
    trips: trips ?? [],
    payments: payments ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="taxiflow-data-${user.id.slice(0, 8)}.json"`,
    },
  });
}
