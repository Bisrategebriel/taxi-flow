# Phase 5 — AI Chatbot

> **Status:** Implementation complete — ready for manual QA
> **Estimated time:** 2–3 hours
> **Branch:** `phase-05-ai-chatbot`
> **Prerequisite:** Phase 4 PR merged to `main`, CI green

---

## 5.1 Goal

Add a Groq-powered AI assistant to the user PWA. The bot answers questions about routes, fares, and terminals by calling server-side tools that query Supabase in real time. Responses stream back to the client. Every conversation turn is persisted to `chat_logs`. An admin can disable the feature via `system_settings`.

At the end of this phase:

- `lib/groq/` holds the Groq client, system prompt, and four tool definitions
- `app/api/chat/route.ts` handles auth, the AI toggle, multi-turn function-calling, and streamed responses
- `components/chat/` provides `ChatWindow`, `ChatMessage`, and `ChatInput`
- `app/(user)/chat/page.tsx` always starts a fresh session and shows a disabled state if the toggle is off
- First token arrives within 3 s for typical queries (NFR-PE-03)

**Covers:** SRS §4.6 (FR-AI-01..08), §10 (FR-CB-01..08), §12.2 (NFR-PE-03), §12.4 (NFR-RE-06)

---

## 5.2 Pre-flight check

```bash
# 1. Merge phase-04 PR to main first, then:
git checkout main && git pull origin main
git log --oneline -1   # should be the phase-04 merge commit

# 2. Clean build on main
pnpm install && pnpm type-check && pnpm build

# 3. Confirm GROQ_API_KEY is set
grep GROQ_API_KEY .env.local   # must print a non-empty value

# 4. Local Supabase running
supabase status

# 5. Confirm chat_logs table exists
# supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name='chat_logs';"
# Expected columns: id, user_id, session_id, role, content, created_at

# 6. Confirm ai_chat_enabled system setting exists
# supabase db query "SELECT value FROM system_settings WHERE key='ai_chat_enabled';"
# Expected: true
```

> **Groq API key (free tier):**
> 1. Go to https://console.groq.com → **API Keys** → **Create API key**
> 2. Add to `.env.local`:
>    ```
>    GROQ_API_KEY=your_key_here
>    ```
> The free tier allows 14,400 requests/day on `llama-3.3-70b-versatile` — plenty for development.

---

## 5.3 Step-by-step tasks

---

### Task 1 — Create the phase branch

```bash
git checkout -b phase-05-ai-chatbot
```

---

### Task 2 — Install packages

```bash
pnpm add groq-sdk react-markdown
```

Packages added:
- `groq-sdk` — official Groq SDK (OpenAI-compatible API)
- `react-markdown` — renders the model's markdown-formatted responses in the chat UI

---

### Task 3 — Claude Code Prompt: AI chatbot

Copy everything inside the fence and paste into Claude Code:

```
Read PLAN.md before doing anything. We are on branch phase-05-ai-chatbot.

─────────────────────────────────────────────────────────────────────
IMPORTANT CONTEXT
─────────────────────────────────────────────────────────────────────

Tailwind 4, CSS-first, no tailwind.config.ts.
shadcn/ui + cn() from @/lib/utils. Uppercase component filenames.
Next.js 16 App Router. Server components by default; add "use client" only when needed.

GROQ_API_KEY is server-only (no NEXT_PUBLIC prefix). Never expose it to the client.

Database schema (relevant tables):
  chat_logs:      id, user_id, session_id (UUID), role ('user'|'assistant'), content, created_at
  system_settings: key, value (JSONB) — the key 'ai_chat_enabled' holds boolean true or false
  terminals:      id, name, city, lat, lng, is_active
  routes:         id, name, start_terminal_id, end_terminal_id, intermediate_stops, is_active
  fares:          id, route_id, amount, currency, effective_from, effective_to
  distances:      from_terminal_id, to_terminal_id, distance_km, duration_minutes

Seed data reminder:
  5 terminals: Merkato, Piassa, Megenagna, Kaliti, Saris
  3 main routes: Merkato→Megenagna ($2.50), Piassa→Kaliti ($3.00), Saris→Megenagna ($2.00)
  2 segment routes: Merkato→Piassa ($1.00), Piassa→Megenagna ($1.50)

Do not touch supabase/, types/, app/(landing)/, app/(admin)/, auth pages, or
any lib/supabase/ files. Stage all changes but do NOT commit.

─────────────────────────────────────────────────────────────────────
TASK 1: Groq client — lib/groq/client.ts
─────────────────────────────────────────────────────────────────────

// FR-AI-01
import Groq from "groq-sdk";
if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
export const GROQ_MODEL = "llama-3.3-70b-versatile";

─────────────────────────────────────────────────────────────────────
TASK 2: System prompt — lib/groq/system-prompt.ts
─────────────────────────────────────────────────────────────────────

// FR-AI-03
Export a SYSTEM_PROMPT string that:
- Introduces the bot as "TaxiFlow Assistant"
- States it serves Addis Ababa commuters
- Lists what it can help with (routes, fares, terminals, travel times)
- Instructs it to always use tools for real data, never guess
- Tells it to respond concisely using markdown where helpful
- States currency is USD, distances are in kilometres

─────────────────────────────────────────────────────────────────────
TASK 3: Tool definitions — lib/groq/tools.ts
─────────────────────────────────────────────────────────────────────

// FR-AI-02
Import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions".
Import type { SupabaseClient } from "@supabase/supabase-js".

Export toolDeclarations: ChatCompletionTool[] with four tools (type: "function"):

1. get_terminals — no parameters
2. get_routes — optional terminal_name string parameter
3. get_fare — required from_terminal + to_terminal string parameters
4. get_route_details — required from_terminal + to_terminal string parameters

Export executeFunction(name, args, supabase) dispatcher.

─────────────────────────────────────────────────────────────────────
TASK 4: Route Handler — app/api/chat/route.ts
─────────────────────────────────────────────────────────────────────

// FR-AI-01..08, FR-CB-01..08, NFR-PE-03
POST handler. Accepts JSON body: { message: string, sessionId: string, history: { role, content }[] }

Steps:
1. Auth check — return 401 if no user
2. Query system_settings for ai_chat_enabled (JSONB boolean true) — return 503 if disabled
3. Validate message is non-empty
4. Insert user message into chat_logs
5. Build messages array: [system prompt, ...history, current user message]
   Convert history role "assistant" → "assistant" (already correct for Groq)
6. Return a streaming ReadableStream that:
   a. Runs function-calling loop (max 5 rounds) using groq.chat.completions.create
      with tools: toolDeclarations, tool_choice: "auto"
   b. If tool_calls: execute in parallel, append assistant + tool messages, continue
   c. If no tool_calls: capture content as finalText, break
   d. Stream finalText in ~40-char chunks with 15ms delay
   e. On error: stream graceful fallback message
   f. After streaming: insert assistant message into chat_logs
7. Return stream with Content-Type: text/plain; charset=utf-8

Tool response message format (Groq/OpenAI):
  { role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) }

─────────────────────────────────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────────────────────────────────

- GROQ_API_KEY is server-only. Never use NEXT_PUBLIC prefix.
- history sent from client must NOT include the current user message (it is added separately).
- Every new file must reference its FR/NFR IDs in a comment at the top.
- Do not create tailwind.config.ts.
- Stage all changes but do NOT commit.
```

---

### Task 4 — Manual QA

```bash
supabase start
pnpm dev
```

Sign in as `alice@taxiflow.test / User1234!`. Navigate to **AI Assistant** (chat icon in bottom nav).

**Empty state:**
- [ ] TaxiFlow AI header with back button and reset button
- [ ] AI greeting message shown
- [ ] Four suggestion chips visible at the bottom

**Fare query (tests `get_fare` tool):**
- [ ] Click "How much does it cost from Piassa to Megenagna?"
- [ ] Thinking indicator (bouncing dots) appears
- [ ] Response streams in, showing Piassa→Megenagna fare ($1.50 USD)
- [ ] Message persisted: `SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT 4;`

**Route list query (tests `get_routes` tool):**
- [ ] Type: "What routes are available from Merkato?"
- [ ] Bot lists Merkato-based routes with fares

**Terminal list query (tests `get_terminals` tool):**
- [ ] Type: "List all terminals"
- [ ] Bot returns all 5 terminals with city info

**Route details query (tests `get_route_details` tool):**
- [ ] Type: "Tell me about the route from Merkato to Megenagna"
- [ ] Bot returns route name, distance, duration, fare, intermediate stop (Piassa)

**AI disabled state (FR-AI-08):**
- [ ] Run: `UPDATE system_settings SET value = 'false' WHERE key = 'ai_chat_enabled';`
- [ ] Reload chat page → disabled state shown (no input field)
- [ ] Restore: `UPDATE system_settings SET value = 'true' WHERE key = 'ai_chat_enabled';`

**Fresh session on reload:**
- [ ] Navigate away and back to /chat → welcome screen shown (no old messages)
- [ ] Reset button (↺) clears messages and starts new session

**Mobile (375px):**
- [ ] Chat window fills screen, input stays at bottom
- [ ] Markdown (bold, lists) in assistant messages renders correctly

---

### Task 5 — Write tests — tests/chat.test.ts

Create `tests/chat.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("Groq client", () => {
  it("groq is importable without throwing", async () => {
    process.env.GROQ_API_KEY = process.env.GROQ_API_KEY ?? "test-stub";
    const mod = await import("@/lib/groq/client");
    expect(mod.groq).toBeDefined();
    expect(mod.GROQ_MODEL).toBe("llama-3.3-70b-versatile");
  });
});

describe("Groq tools", () => {
  it("toolDeclarations exports four tools", async () => {
    const { toolDeclarations } = await import("@/lib/groq/tools");
    expect(toolDeclarations).toHaveLength(4);
    const names = toolDeclarations.map((t) => t.function.name);
    expect(names).toContain("get_terminals");
    expect(names).toContain("get_routes");
    expect(names).toContain("get_fare");
    expect(names).toContain("get_route_details");
  });

  it("all tool declarations have type 'function'", async () => {
    const { toolDeclarations } = await import("@/lib/groq/tools");
    for (const tool of toolDeclarations) {
      expect(tool.type).toBe("function");
    }
  });
});

describe("System prompt", () => {
  it("SYSTEM_PROMPT is a non-empty string", async () => {
    const { SYSTEM_PROMPT } = await import("@/lib/groq/system-prompt");
    expect(typeof SYSTEM_PROMPT).toBe("string");
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });
});
```

---

### Task 6 — Commit and open PR

```bash
git add lib/groq/
git add app/api/chat/
git add components/chat/
git add "app/(user)/chat/page.tsx"
git add tests/chat.test.ts
git add package.json pnpm-lock.yaml

git commit -m "phase-5: Groq AI chatbot with function-calling and streamed responses"

git push -u origin phase-05-ai-chatbot

gh pr create \
  --title "phase-5: AI chatbot (Groq, function-calling, streamed)" \
  --body "$(cat <<'EOF'
## Summary
- lib/groq/client.ts: Groq instance (llama-3.3-70b-versatile)
- lib/groq/system-prompt.ts: TaxiFlow-scoped system prompt
- lib/groq/tools.ts: 4 function-calling tools backed by Supabase queries
- app/api/chat/route.ts: POST handler — auth, AI toggle, multi-turn function loop, streaming
- components/chat/: ChatWindow + ChatMessage (react-markdown) + ChatInput
- app/(user)/chat/page.tsx: server component — always fresh session + disabled state
- FR-AI-01..08, FR-CB-01..08, NFR-PE-03, NFR-RE-06 implemented

## Test plan
- [ ] pnpm type-check passes
- [ ] pnpm lint passes
- [ ] pnpm test passes (tool declarations + system prompt tests)
- [ ] pnpm build passes
- [ ] CI green
- [ ] Fare query returns real DB value
- [ ] Route list filtered correctly by terminal name
- [ ] Route details includes distance, duration, stops, fare
- [ ] Messages persisted to chat_logs (both turns)
- [ ] AI disabled state works end-to-end
EOF
)"
```

---

## 5.4 Acceptance script

```bash
pnpm type-check                              # 0 errors
pnpm lint                                    # 0 errors
pnpm test                                    # all pass including chat tests
pnpm build                                   # exits 0
gh run list --limit 1                        # "completed success"

# Manual — sign in as alice@taxiflow.test:
# "How much does it cost from Piassa to Megenagna?" → $1.50 USD
# "What routes are available from Merkato?" → lists Merkato routes
# "Tell me about the Merkato to Megenagna route" → distance, duration, fare, Piassa stop
# Disable AI in system_settings → disabled state shown to user
# Lighthouse: chat page first contentful paint < 2s
```

**All pass = Phase 5 complete.**

---

## 5.5 Common failure modes

**`GROQ_API_KEY is not set` error on startup.**
Confirm the `.env.local` line has no extra spaces and no quotes around the value:
```
GROQ_API_KEY=gsk_...
```
Restart `pnpm dev` after editing `.env.local`.

**Function-calling loop runs but model never returns text.**
The model may be stuck calling tools. Check that each tool executor returns a deterministic object (never throws, never returns `undefined`). The loop has a hard limit of 5 rounds.

**Tool arguments fail to parse.**
Groq returns `tc.function.arguments` as a JSON string. Always `JSON.parse(tc.function.arguments)` before passing to `executeFunction`.

**Streaming response is empty in the browser.**
Check that the API route returns `Content-Type: text/plain; charset=utf-8`. The client reads raw bytes with a `ReadableStreamDefaultReader` — JSON framing would corrupt the stream.

**`react-markdown` ESM error during build.**
Add `"react-markdown"` to `transpilePackages` in `next.config.ts`:
```ts
transpilePackages: ["react-markdown"],
```

**429 Too Many Requests from Groq.**
The free tier has per-minute limits. Wait a moment and retry. The Route Handler returns a specific message: *"I'm receiving too many requests right now."*

---

## 5.6 What's NOT in Phase 5

- ❌ True token-by-token streaming from Groq (uses chunk simulation; SSE streaming is Phase 10 polish)
- ❌ Tool: `get_trip_status` (requires Phase 6 trip tracking)
- ❌ Tool: `get_directions` (ORS directions in chat — deferred)
- ❌ Multi-session switching UI
- ❌ Admin chat log viewer (Phase 8)
- ❌ File/image uploads to the chat
- ❌ Voice input / text-to-speech

---

## 5.7 When you're done

Reply with:
1. Confirmation that all acceptance checks passed (or deviations and why).
2. The PR URL.
3. Any changes made vs. the spec and why.
4. Sample exchange showing a fare query resolved with a real DB value.

I'll then write `PHASE-06-trip-tracking.md`.
