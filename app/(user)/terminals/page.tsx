// FR-NT-01..05, FR-MP-01..05
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Container from "@/components/ui/Container";
import Heading from "@/components/ui/Heading";
import PageSkeleton from "@/components/ui/PageSkeleton";
import TerminalsNearMe from "@/app/(user)/terminals/_components/TerminalsNearMe";

export default async function TerminalsPage() {
  const supabase = await createClient();
  const { data: terminals } = await supabase
    .from("terminals")
    .select("id, name, city, lat, lng")
    .eq("is_active", true)
    .order("name");

  return (
    <Container className="py-6 max-w-lg md:max-w-none">
      <Heading level={1} className="text-xl sm:text-2xl mb-1">
        Terminals
      </Heading>
      <p className="text-muted-foreground text-sm mb-6">
        Browse all taxi terminals or tap &ldquo;Near me&rdquo; to sort by distance.
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <TerminalsNearMe terminals={terminals ?? []} />
      </Suspense>
    </Container>
  );
}
