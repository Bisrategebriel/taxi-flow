// One-off script: exports terminals, routes, fares, distances from local Supabase
// as INSERT statements safe to run in the production SQL editor.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function escape(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    const items = v.map((i) => `'${String(i).replace(/'/g, "''")}'`).join(",");
    return `ARRAY[${items}]::uuid[]`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

function toInserts(table, rows, cols) {
  if (!rows.length) return `-- ${table}: no rows\n`;
  const colList = cols.join(", ");
  const lines = rows.map((row) => {
    const vals = cols.map((c) => escape(row[c])).join(", ");
    return `INSERT INTO public.${table} (${colList}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`;
  });
  return `-- ${table} (${rows.length} rows)\n` + lines.join("\n") + "\n";
}

async function main() {
  const { data: terminals } = await supabase.from("terminals").select("*").order("created_at");
  const { data: routes } = await supabase.from("routes").select("*").order("created_at");
  const { data: fares } = await supabase.from("fares").select("*").order("created_at");
  const { data: distances } = await supabase.from("distances").select("*").order("created_at");

  const terminalCols = ["id","name","address","city","lat","lng","is_active","created_at","updated_at"];
  const routeCols    = ["id","name","start_terminal_id","end_terminal_id","intermediate_stops","is_active","created_at","updated_at"];
  const fareCols     = ["id","route_id","amount","currency","effective_from","effective_to","created_at","updated_at"];
  const distanceCols = ["id","from_terminal_id","to_terminal_id","distance_km","duration_minutes","created_at","updated_at"];

  const sql = [
    "-- TaxiFlow reference data export",
    "-- Run in production Supabase SQL editor\n",
    "SET session_replication_role = replica; -- disable FK checks temporarily\n",
    toInserts("terminals", terminals ?? [], terminalCols),
    toInserts("routes",    routes    ?? [], routeCols),
    toInserts("fares",     fares     ?? [], fareCols),
    toInserts("distances", distances ?? [], distanceCols),
    "\nSET session_replication_role = DEFAULT;",
  ].join("\n");

  writeFileSync("prod_data.sql", sql);
  console.log("Written to prod_data.sql");
  console.log(`  terminals: ${terminals?.length ?? 0}`);
  console.log(`  routes:    ${routes?.length ?? 0}`);
  console.log(`  fares:     ${fares?.length ?? 0}`);
  console.log(`  distances: ${distances?.length ?? 0}`);
}

main().catch(console.error);
