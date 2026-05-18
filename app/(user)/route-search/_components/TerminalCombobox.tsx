"use client";
import { useState, useRef, useEffect } from "react";
import { MapPin, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Terminal {
  id: string;
  name: string;
  city: string;
}

interface Props {
  id: string;
  name: string;
  placeholder: string;
  terminals: Terminal[];
  recentTerminals: Terminal[];
  value: string;
  onChange: (id: string) => void;
}

export default function TerminalCombobox({
  id,
  name,
  placeholder,
  terminals,
  recentTerminals,
  value,
  onChange,
}: Props) {
  const [query, setQuery] = useState(() =>
    value ? (terminals.find((t) => t.id === value)?.name ?? "") : ""
  );
  const [prevValue, setPrevValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display text when value changes externally (e.g. swap button) — React derived-state pattern
  if (prevValue !== value) {
    setPrevValue(value);
    setQuery(value ? (terminals.find((t) => t.id === value)?.name ?? "") : "");
  }

  // Close on outside click and revert to last confirmed selection
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value ? (terminals.find((t) => t.id === value)?.name ?? "") : "");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [value, terminals]);

  const trimmed = query.trim().toLowerCase();

  const filtered = trimmed
    ? terminals.filter(
        (t) =>
          t.name.toLowerCase().includes(trimmed) ||
          t.city.toLowerCase().includes(trimmed)
      )
    : terminals;

  const showRecents = !trimmed && recentTerminals.length > 0;
  const recentSet = new Set(recentTerminals.map((t) => t.id));

  type Item = { terminal: Terminal; section: "recent" | "all" };
  const items: Item[] = showRecents
    ? [
        ...recentTerminals.map((t) => ({ terminal: t, section: "recent" as const })),
        ...filtered
          .filter((t) => !recentSet.has(t.id))
          .map((t) => ({ terminal: t, section: "all" as const })),
      ]
    : filtered.map((t) => ({ terminal: t, section: "all" as const }));

  function select(terminal: Terminal) {
    setQuery(terminal.name);
    onChange(terminal.id);
    setOpen(false);
    setHighlighted(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[highlighted]) select(items[highlighted].terminal);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value ? (terminals.find((t) => t.id === value)?.name ?? "") : "");
    }
  }

  function handleClear() {
    setQuery("");
    onChange("");
    setHighlighted(0);
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <MapPin
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
      />
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange("");
          setHighlighted(0);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-xl border border-border bg-background pl-9 pr-8 py-2.5 text-sm
          text-foreground placeholder:text-muted-foreground
          focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      />
      {query && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Clear"
          onMouseDown={(e) => {
            e.preventDefault();
            handleClear();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      )}

      {open && items.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-lg py-1"
        >
          {items.map((item, i) => {
            const isFirstRecent = i === 0 && showRecents;
            const isFirstAll =
              showRecents &&
              item.section === "all" &&
              (i === 0 || items[i - 1].section === "recent");
            return (
              <li key={item.terminal.id} role="presentation">
                {isFirstRecent && (
                  <div className="flex items-center gap-1.5 px-3 pt-2 pb-0.5">
                    <Clock size={11} className="text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Recent
                    </span>
                  </div>
                )}
                {isFirstAll && (
                  <div className="px-3 pt-2 pb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      All terminals
                    </span>
                  </div>
                )}
                <div
                  role="option"
                  aria-selected={item.terminal.id === value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(item.terminal);
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={cn(
                    "flex items-baseline gap-2 px-3 py-2 cursor-pointer text-sm transition-colors",
                    i === highlighted
                      ? "bg-muted text-foreground"
                      : "text-foreground hover:bg-muted/50",
                    item.terminal.id === value && "font-medium"
                  )}
                >
                  <span>{item.terminal.name}</span>
                  {item.terminal.city && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.terminal.city}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && items.length === 0 && trimmed && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg px-3 py-3 text-sm text-muted-foreground">
          No terminals match &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
