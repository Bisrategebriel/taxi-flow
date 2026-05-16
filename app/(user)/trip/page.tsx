// FR-TR-01 (stub — full implementation Phase 6)
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";

export default function TripPage() {
  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">
        My Trips
      </Heading>
      <p className="text-muted-foreground text-sm">
        View your trip history and active trips — coming in Phase 6.
      </p>
    </Container>
  );
}
