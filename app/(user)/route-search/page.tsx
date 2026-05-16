// FR-RS-01, FR-RS-02
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Container from "@/components/ui/Container";
import Heading from "@/components/ui/Heading";
import RouteSearchForm from "@/app/(user)/route-search/_components/RouteSearchForm";

export default async function RouteSearchPage() {
  const supabase = await createClient();
  const { data: terminals } = await supabase
    .from("terminals")
    .select("id, name, city")
    .eq("is_active", true)
    .order("name");

  return (
    <Container className="py-6 max-w-lg">
      <Heading level={1} className="text-xl sm:text-2xl mb-1">
        Route Search
      </Heading>
      <p className="text-muted-foreground text-sm mb-6">
        Find routes, fares, and directions between terminals.
      </p>
      <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-xl" />}>
        <RouteSearchForm terminals={terminals ?? []} />
      </Suspense>
    </Container>
  );
}
