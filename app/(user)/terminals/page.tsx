// FR-NT-01 (stub — full implementation Phase 4)
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";

export default function TerminalsPage() {
  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">
        Terminals
      </Heading>
      <p className="text-muted-foreground text-sm">
        Find the nearest taxi terminal — coming in Phase 4.
      </p>
    </Container>
  );
}
