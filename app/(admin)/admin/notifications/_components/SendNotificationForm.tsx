"use client";

import { useState, useActionState, useEffect, useRef, useTransition } from "react";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  Tag,
  XCircle,
  BellRing,
  Clock,
  Send,
  Users,
  UserCheck,
  User,
  Search,
  X,
} from "lucide-react";
import {
  sendAdminNotification,
  searchUsersByName,
  type SendNotifState,
} from "@/app/(admin)/admin/_actions/notifications";

// ─── type definitions ─────────────────────────────────────────────────────────

const NOTIF_TYPES = [
  {
    value: "info",
    label: "Info",
    icon: Info,
    activeCls: "border-blue-500 bg-blue-500/10 text-blue-400",
  },
  {
    value: "success",
    label: "Success",
    icon: CheckCircle2,
    activeCls: "border-green-500 bg-green-500/10 text-green-400",
  },
  {
    value: "warning",
    label: "Warning",
    icon: AlertTriangle,
    activeCls: "border-amber-500 bg-amber-500/10 text-amber-400",
  },
  {
    value: "promotional",
    label: "Promotional",
    icon: Tag,
    activeCls: "border-purple-500 bg-purple-500/10 text-purple-400",
  },
  {
    value: "decline",
    label: "Decline",
    icon: XCircle,
    activeCls: "border-red-500 bg-red-500/10 text-red-400",
  },
  {
    value: "alert",
    label: "Alert",
    icon: BellRing,
    activeCls: "border-orange-500 bg-orange-500/10 text-orange-400",
  },
  {
    value: "reminder",
    label: "Reminder",
    icon: Clock,
    activeCls: "border-cyan-500 bg-cyan-500/10 text-cyan-400",
  },
] as const;

const TARGET_OPTIONS = [
  {
    value: "all",
    label: "All Users",
    icon: Users,
    description: "Broadcast to every registered user",
  },
  {
    value: "active",
    label: "Active Users",
    icon: UserCheck,
    description: "Users with recent trip activity",
  },
  {
    value: "specific",
    label: "Specific User",
    icon: User,
    description: "Send to a single user by name",
  },
] as const;

// ─── component ────────────────────────────────────────────────────────────────

export default function SendNotificationForm() {
  const [type, setType] = useState<string>("info");
  const [target, setTarget] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<{ id: string; full_name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string }[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [state, formAction, pending] = useActionState<SendNotifState, FormData>(
    sendAdminNotification,
    {}
  );

  // Reset form on success — deferred to avoid synchronous setState-in-effect
  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    const id = setTimeout(() => {
      setType("info");
      setTarget("all");
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);
      setDropdownOpen(false);
    }, 0);
    return () => clearTimeout(id);
  }, [state.success]);

  // Close user search dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Debounced user search
  useEffect(() => {
    if (target !== "specific" || !searchQuery.trim()) {
      const id = setTimeout(() => {
        setSearchResults([]);
        setDropdownOpen(false);
      }, 0);
      return () => clearTimeout(id);
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const results = await searchUsersByName(searchQuery);
        setSearchResults(results);
        setDropdownOpen(results.length > 0);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, target]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <Send size={14} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Send Push Notification</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compose and broadcast a notification to users
          </p>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="p-5 space-y-5">
        {/* Hidden controlled inputs */}
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="target" value={target} />
        {target === "specific" && selectedUser && (
          <input type="hidden" name="target_user_id" value={selectedUser.id} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── Left column: content ── */}
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Title
              </label>
              <input
                name="title"
                type="text"
                required
                placeholder="Notification title…"
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Message
              </label>
              <textarea
                name="body"
                required
                rows={4}
                placeholder="Write your notification message here…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* ── Right column: type + target ── */}
          <div className="space-y-4">
            {/* Type picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Type
              </label>
              <div className="flex flex-wrap gap-2">
                {NOTIF_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? t.activeCls
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon size={11} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audience picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Audience
              </label>
              <div className="flex flex-col gap-2">
                {TARGET_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = target === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setTarget(opt.value);
                        if (opt.value !== "specific") {
                          setSelectedUser(null);
                          setSearchQuery("");
                          setSearchResults([]);
                          setDropdownOpen(false);
                        }
                      }}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon size={15} className={active ? "text-primary" : ""} />
                      <div>
                        <p className={`text-xs font-medium ${active ? "text-foreground" : ""}`}>
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                      <div
                        className={`ml-auto h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          active ? "border-primary" : "border-border"
                        }`}
                      >
                        {active && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* User search — only shown when "specific" is selected */}
              {target === "specific" && (
                <div ref={searchBoxRef} className="relative mt-1">
                  {selectedUser ? (
                    <div className="flex items-center gap-2.5 rounded-lg border border-primary bg-primary/5 px-3 py-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary uppercase">
                        {selectedUser.full_name.charAt(0)}
                      </div>
                      <span className="flex-1 text-sm font-medium text-foreground">
                        {selectedUser.full_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(null);
                          setSearchQuery("");
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search
                          size={13}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                          placeholder="Search user by name…"
                          className="w-full h-9 rounded-lg border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      {dropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
                          {searchResults.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedUser(u);
                                setSearchQuery("");
                                setSearchResults([]);
                                setDropdownOpen(false);
                              }}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                                {u.full_name.charAt(0)}
                              </div>
                              <span className="text-sm text-foreground">{u.full_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback + Submit */}
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
          <div className="text-xs">
            {state.error && (
              <p className="text-destructive">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500">Notification sent successfully!</p>
            )}
          </div>
          <button
            type="submit"
            disabled={pending || (target === "specific" && !selectedUser)}
            className="flex items-center gap-2 h-9 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          >
            <Send size={13} />
            {pending ? "Sending…" : "Send Notification"}
          </button>
        </div>
      </form>
    </div>
  );
}
