// FR-RS-01 (stub — full implementation Phase 4)
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";

export default function RouteSearchPage() {
  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">
        Route Search
      </Heading>
      <p className="text-muted-foreground text-sm">
        Search for routes between terminals — coming in Phase 4.
      </p>
    </Container>
  );
}
