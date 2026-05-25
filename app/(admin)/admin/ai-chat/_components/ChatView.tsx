"use client";

import {
  useState,
  useRef,
  useEffect,
  useActionState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Search,
  ChevronDown,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertTriangle,
  User,
  MessageSquare,
} from "lucide-react";
import {
  updateSessionStatus,
  sendAdminReply,
  type ReplyState,
} from "@/app/(admin)/admin/_actions/ai-chat";
import { toggleSetting } from "@/app/(admin)/admin/_actions/settings";

// ─── types ────────────────────────────────────────────────────────────────────

export type ChatSession = {
  sessionId: string;
  userId: string;
  userName: string;
  initials: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  status: "active" | "resolved" | "escalated";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ChatStats = {
  sessionsToday: number;
  resolved: number;
  escalated: number;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function sessionDisplayId(id: string) {
  const hex = id.replace(/-/g, "").slice(-4);
  return `CS-${(parseInt(hex, 16) % 10000).toString().padStart(4, "0")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  active: "border-green-500/60 text-green-400 bg-green-500/10",
  resolved: "border-green-500/60 text-green-400 bg-green-500/10",
  escalated: "border-red-500/60 text-red-400 bg-red-500/10",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_CLS[status] ?? STATUS_CLS.active}`}
    >
      {status}
    </span>
  );
}

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <div
      className={`${dim} shrink-0 flex items-center justify-center rounded-full bg-primary/20 font-semibold text-primary uppercase`}
    >
      {initials}
    </div>
  );
}

function FilterDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const OPTIONS = ["All", "Active", "Resolved", "Escalated"];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-accent transition-colors"
      >
        <ChevronDown size={13} className="text-muted-foreground" />
        <span>{value}</span>
        <ChevronDown size={11} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-36 rounded-lg border border-border bg-popover shadow-md overflow-hidden">
          {OPTIONS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${o === value ? "text-primary font-medium" : "text-foreground"}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI toggle ────────────────────────────────────────────────────────────────

function AiToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [on, setOn] = useState(initialEnabled);
  const [, startTransition] = useTransition();

  function handleToggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await toggleSetting("ai_chat_enabled", next);
      } catch {
        setOn(!next);
      }
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm font-medium text-foreground">{on ? "Enabled" : "Disabled"}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors ${on ? "border-primary bg-primary" : "border-border bg-muted"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

// ─── manual reply form ────────────────────────────────────────────────────────

function ManualReplyForm({
  session,
}: {
  session: ChatSession;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ReplyState, FormData>(
    sendAdminReply,
    {}
  );

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="border-t border-border p-4 shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Manual Reply
      </p>
      <form ref={formRef} action={formAction} className="space-y-3">
        <input type="hidden" name="session_id" value={session.sessionId} />
        <input type="hidden" name="user_id" value={session.userId} />

        <textarea
          name="content"
          rows={3}
          required
          placeholder="Type your reply…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />

        {state.error && <p className="text-xs text-destructive">{state.error}</p>}

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="mark_resolved"
              value="1"
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
            <span className="text-xs text-muted-foreground">Mark as resolved</span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 h-8 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send size={11} />
            {pending ? "Sending…" : "Send Reply"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ChatView({
  sessions,
  selectedSessionId,
  selectedMessages,
  stats,
  aiEnabled,
}: {
  sessions: ChatSession[];
  selectedSessionId: string | null;
  selectedMessages: ChatMessage[];
  stats: ChatStats;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when they change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMessages]);

  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId) ?? null;

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    if (filter !== "All" && s.status !== filter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.userName.toLowerCase().includes(q) && !s.lastMessage.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function selectSession(sessionId: string) {
    startTransition(() => {
      router.push(`/admin/ai-chat?session=${sessionId}`);
    });
  }

  function handleStatusChange(session: ChatSession, status: "active" | "resolved" | "escalated") {
    startTransition(async () => {
      await updateSessionStatus(session.sessionId, session.userId, status);
    });
  }

  return (
    <div className="p-6 flex flex-col gap-5 h-[calc(100svh-3.5rem)] overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold">AI Chat Support</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage AI assistant and view chat logs</p>
      </div>

      {/* ── Status card ── */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-6 py-5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Bot size={18} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">TaxiFlow AI Assistant</p>
                <span className="flex items-center gap-1.5 rounded-full border border-green-500/60 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  Online
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Actively responding to user queries in real-time
              </p>
            </div>
          </div>
          <AiToggle initialEnabled={aiEnabled} />
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-border/50">
          <div className="flex items-center gap-3 pr-6">
            <MessageSquare size={16} className="text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold text-primary">{stats.sessionsToday}</p>
              <p className="text-xs text-muted-foreground">Sessions Today</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6">
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-6">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-400">{stats.escalated}</p>
              <p className="text-xs text-muted-foreground">Escalated</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Split panel ── */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left: session list */}
        <div className="w-80 shrink-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="p-3 border-b border-border space-y-2.5 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sessions…"
                className="w-full h-9 rounded-lg border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <FilterDropdown value={filter} onChange={setFilter} />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border scrollbar-thin">
            {filteredSessions.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No sessions found.</p>
            ) : (
              filteredSessions.map((s) => {
                const active = s.sessionId === selectedSessionId;
                return (
                  <button
                    key={s.sessionId}
                    type="button"
                    onClick={() => selectSession(s.sessionId)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 ${
                      active ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <Avatar initials={s.initials} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{s.userName}</p>
                        <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
                          <span>{formatTime(s.lastMessageAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-muted-foreground truncate">{s.lastMessage}</p>
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-muted-foreground shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: chat panel */}
        <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex flex-col min-w-0">
          {selectedSession ? (
            <>
              {/* Chat header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar initials={selectedSession.initials} />
                  <div>
                    <p className="text-sm font-semibold">{selectedSession.userName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sessionDisplayId(selectedSession.sessionId)} · {selectedSession.messageCount} messages
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedSession.status} />
                  {/* Status action buttons */}
                  {selectedSession.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedSession, "resolved")}
                      className="flex items-center gap-1.5 h-7 rounded-lg border border-green-500/60 bg-green-500/10 px-2.5 text-[11px] font-medium text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      <CheckCircle2 size={11} />
                      Resolve
                    </button>
                  )}
                  {selectedSession.status !== "escalated" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedSession, "escalated")}
                      className="flex items-center gap-1.5 h-7 rounded-lg border border-red-500/60 bg-red-500/10 px-2.5 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <AlertTriangle size={11} />
                      Escalate
                    </button>
                  )}
                  {selectedSession.status !== "active" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedSession, "active")}
                      className="flex items-center gap-1.5 h-7 rounded-lg border border-green-500/60 bg-green-500/10 px-2.5 text-[11px] font-medium text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
                {selectedMessages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isUser ? "bg-muted border border-border" : "bg-primary/20"
                        }`}
                      >
                        {isUser ? (
                          <User size={13} className="text-muted-foreground" />
                        ) : (
                          <Bot size={13} className="text-primary" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[72%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isUser
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted border border-border text-foreground rounded-bl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground px-1">
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Manual reply — shown for active and escalated sessions */}
              {selectedSession.status !== "resolved" && (
                <ManualReplyForm session={selectedSession} />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <MessageSquare size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Select a session</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Choose a chat session from the left to view the conversation and send a manual reply.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
