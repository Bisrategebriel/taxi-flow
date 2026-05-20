// FR-AI-01..08, FR-CB-01..08
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ChatWindow from "@/components/chat/ChatWindow";

export default async function ChatPage() {
  const supabase = await createClient();

  // Check ai_chat_enabled setting (FR-AI-08)
  const { data: setting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "ai_chat_enabled")
    .single();

  const isEnabled = setting?.value === true || setting?.value === "true";

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Sparkles size={22} className="text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground">AI Assistant unavailable</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          The AI chatbot has been temporarily disabled by an administrator.
        </p>
      </div>
    );
  }

  // Always start a fresh session on page load (FR-AI-06: messages still saved to DB)
  const sessionId = crypto.randomUUID();

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] md:h-screen">
      <ChatWindow
        initialMessages={[]}
        sessionId={sessionId}
      />
    </div>
  );
}
