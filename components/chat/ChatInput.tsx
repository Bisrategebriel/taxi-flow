"use client";
// FR-CB-01
import { useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function ChatInput({ value, onChange, onSend, disabled, isLoading }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isLoading && value.trim()) onSend();
    }
  }

  const canSend = !disabled && !isLoading && value.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 flex items-end rounded-full border border-border bg-background px-4 py-2 focus-within:ring-2 focus-within:ring-primary/40 transition-shadow">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={disabled ? "AI chat is disabled" : "Ask about routes, fares, terminals..."}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm text-foreground",
              "placeholder:text-muted-foreground leading-relaxed",
              "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
            canSend
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-2">
        AI responses are for informational purposes only
      </p>
    </div>
  );
}
