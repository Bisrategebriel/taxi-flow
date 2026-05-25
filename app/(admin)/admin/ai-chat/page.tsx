import { createServiceClient } from "@/lib/supabase/service";
import ChatView, {
  type ChatSession,
  type ChatMessage,
  type ChatStats,
} from "./_components/ChatView";

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default async function AdminAiChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: selectedSessionId } = await searchParams;
  const service = createServiceClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // ── Fetch all recent chat logs to derive sessions ──────────────────────────
  const [{ data: allLogs }, { data: todayLogs }] = await Promise.all([
    service
      .from("chat_logs")
      .select("id, session_id, user_id, role, content, created_at")
      .order("created_at", { ascending: false })
      .limit(800),
    service
      .from("chat_logs")
      .select("session_id")
      .gte("created_at", todayStart.toISOString()),
  ]);

  // ── Group logs into sessions (first encounter = most recent message) ───────
  type SessionAccum = {
    userId: string;
    lastMessage: string;
    lastMessageAt: string;
    messageCount: number;
  };
  const sessionMap = new Map<string, SessionAccum>();
  for (const log of allLogs ?? []) {
    if (!sessionMap.has(log.session_id)) {
      sessionMap.set(log.session_id, {
        userId: log.user_id,
        lastMessage: log.content,
        lastMessageAt: log.created_at,
        messageCount: 0,
      });
    }
    sessionMap.get(log.session_id)!.messageCount++;
  }

  const sessionIds = [...sessionMap.keys()];
  const userIds = [...new Set([...sessionMap.values()].map((s) => s.userId))];

  // ── Fetch user names and session statuses in parallel ──────────────────────
  const [{ data: profiles }, sessionStatusRows] = await Promise.all([
    service.from("profiles").select("id, full_name").in("id", userIds),
    (async () => {
      if (sessionIds.length === 0) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (service as any)
          .from("chat_sessions")
          .select("session_id, status")
          .in("session_id", sessionIds);
        return data ?? [];
      } catch {
        return [];
      }
    })(),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name])
  );
  const statusMap = new Map<string, string>(
    (sessionStatusRows as { session_id: string; status: string }[]).map((r) => [
      r.session_id,
      r.status,
    ])
  );

  // ── Build typed sessions array ─────────────────────────────────────────────
  const sessions: ChatSession[] = [...sessionMap.entries()].map(([sessionId, accum]) => {
    const name = profileMap.get(accum.userId) ?? "Unknown";
    const status = (statusMap.get(sessionId) ?? "active") as ChatSession["status"];
    return {
      sessionId,
      userId: accum.userId,
      userName: name,
      initials: initials(name),
      lastMessage: accum.lastMessage,
      lastMessageAt: accum.lastMessageAt,
      messageCount: accum.messageCount,
      status,
    };
  });

  // ── Selected session messages ──────────────────────────────────────────────
  let selectedMessages: ChatMessage[] = [];
  if (selectedSessionId) {
    const { data: msgs } = await service
      .from("chat_logs")
      .select("id, role, content, created_at")
      .eq("session_id", selectedSessionId)
      .order("created_at", { ascending: true });
    selectedMessages = (msgs ?? []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.created_at,
    }));
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const todaySessionIds = new Set((todayLogs ?? []).map((l) => l.session_id));
  const stats: ChatStats = {
    sessionsToday: todaySessionIds.size,
    resolved: sessions.filter((s) => s.status === "resolved").length,
    escalated: sessions.filter((s) => s.status === "escalated").length,
  };

  // ── ai_chat_enabled setting ────────────────────────────────────────────────
  const { data: aiSetting } = await service
    .from("system_settings")
    .select("value")
    .eq("key", "ai_chat_enabled")
    .single();
  const aiEnabled = aiSetting?.value === true || aiSetting?.value === "true";

  return (
    <ChatView
      sessions={sessions}
      selectedSessionId={selectedSessionId ?? null}
      selectedMessages={selectedMessages}
      stats={stats}
      aiEnabled={aiEnabled}
    />
  );
}
