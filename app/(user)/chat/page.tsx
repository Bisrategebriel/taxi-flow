// FR-AI-01 (stub — full implementation Phase 5)
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";

export default function ChatPage() {
  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">
        AI Assistant
      </Heading>
      <p className="text-muted-foreground text-sm">
        Chat with our AI about routes and fares — coming in Phase 5.
      </p>
    </Container>
  );
}
