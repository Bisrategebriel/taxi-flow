"use client";
// FR-AI-01..06, FR-CB-01..08
import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  RotateCcw,
  Navigation,
  DollarSign,
  MapPin,
  Clock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  initialMessages: Message[];
  sessionId: string;
}

const STARTERS = [
  { icon: Navigation, text: "What routes are available from Merkato?" },
  { icon: DollarSign, text: "How much does it cost from Piassa to Megenagna?" },
  { icon: MapPin, text: "What terminals are there in Addis Ababa?" },
  { icon: Clock, text: "How long is the trip from Merkato to Megenagna?" },
];

const GREETING =
  "Hello! I'm the TaxiFlow AI assistant. I can help you find routes, check fares, and locate terminals. How can I help you today?";

export default function ChatWindow({ initialMessages, sessionId: initialSessionId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  function resetChat() {
    abortRef.current?.abort();
    setMessages([]);
    setStreamingContent("");
    setInput("");
    setSessionId(crypto.randomUUID());
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          sessionId,
          // Send only previous messages — API route appends the current message separately
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errText || "Something went wrong. Please try again." },
        ]);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamingContent(full);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: full }]);
      setStreamingContent("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Connection error. Please try again." },
        ]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  }

  const showStarters = messages.length === 0 && !isLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card w-full">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Sparkles size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">TaxiFlow AI</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-emerald-500">●</span> Online · Powered by Gemini
          </p>
        </div>
        <button
          type="button"
          onClick={resetChat}
          aria-label="Reset chat"
          className="ml-auto p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">
        {showStarters ? (
          <>
            {/* AI greeting */}
            <ChatMessage role="assistant" content={GREETING} />

            {/* Push suggestions to bottom */}
            <div className="flex-1" />

            {/* Suggestion chips */}
            <div className="pb-2">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">
                Suggestions
              </p>
              <div className="flex flex-col gap-2">
                {STARTERS.map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => sendMessage(text)}
                    className="flex items-center gap-3 rounded-full border border-border bg-card
                      px-4 py-2.5 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors"
                  >
                    <Icon size={14} className="text-primary shrink-0" />
                    <span className="flex-1 text-xs text-foreground">{text}</span>
                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}

            {/* Streaming assistant message */}
            {isLoading && streamingContent && (
              <ChatMessage role="assistant" content={streamingContent} isStreaming />
            )}

            {/* Thinking indicator */}
            {isLoading && !streamingContent && (
              <div className="flex gap-2 justify-start">
                <div className="shrink-0 mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles size={13} className="text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((j) => (
                      <span
                        key={j}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: `${j * 150}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => sendMessage()}
        isLoading={isLoading}
      />
    </div>
  );
}
