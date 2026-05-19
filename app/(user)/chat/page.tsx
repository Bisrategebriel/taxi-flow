// FR-AI-01..08, FR-CB-01..08
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ChatWindow from "@/components/chat/ChatWindow";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  // Load the most recent session and its last 20 messages (FR-AI-05, FR-AI-06)
  let sessionId: string;
  let initialMessages: { role: "user" | "assistant"; content: string }[] = [];

  if (user) {
    const { data: recentLog } = await supabase
      .from("chat_logs")
      .select("session_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentLog?.session_id) {
      sessionId = recentLog.session_id;
      const { data: history } = await supabase
        .from("chat_logs")
        .select("role, content")
        .eq("user_id", user.id)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(20);
      initialMessages = (history ?? []) as typeof initialMessages;
    } else {
      sessionId = crypto.randomUUID();
    }
  } else {
    sessionId = crypto.randomUUID();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
      <ChatWindow
        initialMessages={initialMessages}
        sessionId={sessionId}
      />
    </div>
  );
}
