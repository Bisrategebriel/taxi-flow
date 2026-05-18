// FR-RS-01, FR-RS-02
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RouteSearchForm from "@/app/(user)/route-search/_components/RouteSearchForm";

export default async function RouteSearchPage() {
  const supabase = await createClient();
  const { data: terminals } = await supabase
    .from("terminals")
    .select("id, name, city")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="px-4 py-5 pb-8 max-w-lg mx-auto w-full md:px-6">
      <Link
        href="/dashboard"
        aria-label="Back to dashboard"
        className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft size={20} />
      </Link>
      <h1 className="text-2xl font-bold text-foreground">Find a Route</h1>
      <p className="text-sm text-muted-foreground mt-0.5 mb-6">
        Search taxi routes between terminals
      </p>

      <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-2xl" />}>
        <RouteSearchForm terminals={terminals ?? []} />
      </Suspense>
    </div>
  );
}
