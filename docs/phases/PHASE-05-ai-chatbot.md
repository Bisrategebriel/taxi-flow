# Phase 5 — AI Chatbot

> **Status:** Implementation complete — ready for manual QA
> **Estimated time:** 2–3 hours
> **Branch:** `phase-05-ai-chatbot`
> **Prerequisite:** Phase 4 PR merged to `main`, CI green

---

## 5.1 Goal

Add a Gemini-powered AI assistant to the user PWA. The bot answers questions about routes, fares, and terminals by calling server-side tools that query Supabase in real time. Responses stream back to the client. Every conversation turn is persisted to `chat_logs`. An admin can disable the feature via `system_settings`.

At the end of this phase:

- `lib/gemini/` holds the Gemini client, system prompt, and four tool definitions
- `app/api/chat/route.ts` handles auth, the AI toggle, multi-turn function-calling, and streamed responses
- `components/chat/` provides `ChatWindow`, `ChatMessage`, and `ChatInput`
- `app/(user)/chat/page.tsx` loads chat history from the DB and shows a disabled state if the toggle is off
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

# 3. Confirm GEMINI_API_KEY is set
grep GEMINI_API_KEY .env.local   # must print a non-empty value

# 4. Local Supabase running
supabase status

# 5. Confirm chat_logs table exists
# supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name='chat_logs';"
# Expected columns: id, user_id, session_id, role, content, created_at

# 6. Confirm ai_chat_enabled system setting exists
# supabase db query "SELECT value FROM system_settings WHERE key='ai_chat_enabled';"
# Expected: "true"
```

> **Gemini API key (free tier):**
> 1. Go to https://aistudio.google.com → **Get API key** → **Create API key**
> 2. Add to `.env.local`:
>    ```
>    GEMINI_API_KEY=your_key_here
>    ```
> The free tier allows 60 requests/minute on `gemini-2.0-flash` — plenty for development.

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
pnpm add @google/generative-ai react-markdown
```

Packages added:
- `@google/generative-ai` — official Google Gemini SDK for Node.js
- `react-markdown` — renders Gemini's markdown-formatted responses in the chat UI

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

GEMINI_API_KEY is server-only (no NEXT_PUBLIC prefix). Never expose it to the client.

Database schema (relevant tables):
  chat_logs:      id, user_id, session_id (UUID), role ('user'|'assistant'), content, created_at
  system_settings: key, value  — the key 'ai_chat_enabled' holds 'true' or 'false' (string)
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
TASK 1: Gemini client — lib/gemini/client.ts
─────────────────────────────────────────────────────────────────────

// FR-AI-01
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

─────────────────────────────────────────────────────────────────────
TASK 2: System prompt — lib/gemini/system-prompt.ts
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
TASK 3: Tool definitions — lib/gemini/tools.ts
─────────────────────────────────────────────────────────────────────

// FR-AI-02
Import SchemaType from "@google/generative-ai".
Import type { FunctionDeclaration } from "@google/generative-ai".
Import type { SupabaseClient } from "@supabase/supabase-js".

Export toolDeclarations: FunctionDeclaration[] with four tools:

1. get_terminals
   description: Returns all active taxi terminals with names, cities, coordinates.
   parameters: none

2. get_routes
   description: Returns active routes. Optionally filter by terminal name.
   parameters:
     terminal_name (string, optional): partial match filter

3. get_fare
   description: Returns the fare between two terminals.
   parameters:
     from_terminal (string, required): departure terminal name (partial match)
     to_terminal (string, required): destination terminal name (partial match)

4. get_route_details
   description: Returns route details (distance, duration, intermediate stops, fare).
   parameters:
     from_terminal (string, required)
     to_terminal (string, required)

Use SchemaType.OBJECT / SchemaType.STRING — NOT the plain string literals
"object" / "string" (TypeScript will reject them).

Export executeFunction(name, args, supabase) that dispatches to the correct
server-side function. Each function queries Supabase and returns a plain object.
Return { found: false, message: "..." } when a lookup yields no results.

For get_routes: join start and end terminal names using
  .select(`id, name,
    start:terminals!routes_start_terminal_id_fkey(name),
    end:terminals!routes_end_terminal_id_fkey(name),
    fares(amount, currency, effective_from)`)
Cast joined objects through unknown: (r.start as unknown as { name: string } | null)

─────────────────────────────────────────────────────────────────────
TASK 4: Route Handler — app/api/chat/route.ts
─────────────────────────────────────────────────────────────────────

// FR-AI-01..08, FR-CB-01..08, NFR-PE-03
POST handler. Accepts JSON body: { message: string, sessionId: string, history: { role, content }[] }

Steps in order:
1. Auth check via createClient() — return 401 if no user
2. Query system_settings for ai_chat_enabled — return 503 if value !== "true" (FR-AI-08)
3. Validate message is non-empty
4. Insert user message into chat_logs (FR-AI-06)
5. Build Gemini model with:
     model: "gemini-2.0-flash"
     systemInstruction: SYSTEM_PROMPT
     tools: [{ functionDeclarations: toolDeclarations }]
     toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
6. Convert history (role "assistant" → "model") to Gemini Content[] format
7. Return a streaming Response (ReadableStream) that:
   a. Runs a function-calling loop (max 5 rounds):
      - Call model.generateContent({ contents })
      - If response has functionCalls: execute them all in parallel, append
        model turn + function response turn to contents, continue loop
      - If no functionCalls: capture response.text() as finalText, break
   b. Streams finalText in ~40-char chunks with 15ms delay between chunks
      (simulates streaming; first bytes arrive < 1s — NFR-PE-03)
   c. On error: stream a graceful fallback message (NFR-RE-06)
      Handle 429 specifically: "I'm receiving too many requests right now..."
   d. After streaming: insert assistant message into chat_logs (FR-AI-06)
8. Return the stream with Content-Type: text/plain; charset=utf-8

Type the contents accumulator as Content[] from "@google/generative-ai".
Cast model function-call turns: { role: "model", parts: candidate.content.parts } as Content
Cast function-response turns: { role: "user", parts: fnResponses } as Content
Cast fc.args: (fc.args ?? {}) as Record<string, unknown>

─────────────────────────────────────────────────────────────────────
TASK 5: ChatMessage component — components/chat/ChatMessage.tsx
─────────────────────────────────────────────────────────────────────

// FR-CB-02, FR-CB-03
"use client";
Props: role ("user" | "assistant"), content (string), isStreaming? (boolean)

Layout:
- User messages: right-aligned bubble, bg-primary text-primary-foreground, rounded-tr-sm
- Assistant messages: left-aligned bubble, bg-muted text-foreground, rounded-tl-sm
- Each side has a small avatar label: "Me" (user) or "AI" (assistant) in a 7×7 circle

User message: render content in a <p className="whitespace-pre-wrap">
Assistant message: render with <ReactMarkdown> from "react-markdown" with custom
component overrides for p, ul, ol, li, strong, em, code, pre.
When isStreaming is true, show a blinking cursor after the text.

─────────────────────────────────────────────────────────────────────
TASK 6: ChatInput component — components/chat/ChatInput.tsx
─────────────────────────────────────────────────────────────────────

// FR-CB-01
"use client";
Props: value, onChange, onSend, disabled?, isLoading?

A resizing textarea (auto-grow up to 160px via useEffect on value) + a Send button.
Enter (without Shift) submits the message.
Shift+Enter inserts a newline.
Send button shows <Loader2 animate-spin> when isLoading.
Send button disabled when value is empty, disabled=true, or isLoading=true.
Placeholder: "Ask about routes, fares, terminals…" (or "AI chat is disabled" when disabled).

─────────────────────────────────────────────────────────────────────
TASK 7: ChatWindow component — components/chat/ChatWindow.tsx
─────────────────────────────────────────────────────────────────────

// FR-AI-01..06, FR-CB-01..08
"use client";
Props: initialMessages ({ role, content }[]), sessionId (string)

State: messages, input, isLoading, streamingContent

On mount: scroll bottom ref into view whenever messages or streamingContent changes.

sendMessage(text?) function:
1. Append user message to messages state
2. Clear input
3. Set isLoading = true
4. POST to /api/chat with { message, sessionId, history: last 10 messages }
5. If response.ok is false: show error message from response.text()
6. Read body as a stream (response.body.getReader() + TextDecoder)
7. Accumulate chunks into streamingContent state (renders live as streaming message)
8. When done: push full text as final assistant message, clear streamingContent

Show a welcome screen with Sparkles icon and 4 starter-prompt buttons when messages is empty.
Starter prompts:
  "What routes are available from Merkato?"
  "How much does it cost from Piassa to Megenagna?"
  "What terminals are there in Addis Ababa?"
  "How long is the trip from Merkato to Megenagna?"

Show a "thinking" indicator (3 bouncing dots) while isLoading and streamingContent is empty.
Show the streaming ChatMessage (with isStreaming=true) while content is arriving.

─────────────────────────────────────────────────────────────────────
TASK 8: Replace chat page — app/(user)/chat/page.tsx
─────────────────────────────────────────────────────────────────────

// FR-AI-01..08
Server component.

1. createClient() + getUser()
2. Query system_settings for ai_chat_enabled
3. If disabled: render centred disabled state with Sparkles icon (muted) + message
4. If enabled:
   a. Query chat_logs: get most recent session_id for this user
   b. Load last 20 messages for that session ordered by created_at ASC
   c. If no prior session: generate sessionId = crypto.randomUUID()
   d. Render a fixed-height column layout:
      - Header bar: Sparkles icon + "AI Assistant" / "Powered by Gemini" + green "Online" dot
      - <ChatWindow initialMessages={...} sessionId={...} />
      Height: h-[calc(100vh-4rem)] on mobile, h-screen on md+

─────────────────────────────────────────────────────────────────────
TASK 9: Run verification
─────────────────────────────────────────────────────────────────────

pnpm type-check   # must pass (0 errors)
pnpm lint         # must pass (0 errors)
pnpm test         # must pass
pnpm build        # must pass

─────────────────────────────────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────────────────────────────────

- GEMINI_API_KEY is server-only. Never use NEXT_PUBLIC prefix.
- Tool declarations must use SchemaType enum values, not raw strings.
- Type the contents accumulator as Content[] to avoid TS errors from mixed part types.
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
- [ ] Sparkles icon and welcome message shown
- [ ] Four starter-prompt buttons visible

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
- [ ] Bot returns route name, distance (8.5 km), duration (25 min), fare ($2.50), intermediate stop (Piassa)

**History persistence (FR-AI-06):**
- [ ] Refresh the page — previous messages reload from DB

**AI disabled state (FR-AI-08):**
- [ ] Run: `UPDATE system_settings SET value = 'false' WHERE key = 'ai_chat_enabled';`
- [ ] Reload chat page → disabled state shown (no input field)
- [ ] Restore: `UPDATE system_settings SET value = 'true' WHERE key = 'ai_chat_enabled';`

**Mobile (375px):**
- [ ] Chat window fills screen, input stays at bottom
- [ ] Markdown (bold, lists) in assistant messages renders correctly

---

### Task 5 — Write tests — tests/chat.test.ts

Create `tests/chat.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("Gemini client", () => {
  it("genAI is importable without throwing", async () => {
    // Stub env so the module doesn't throw during import in test env
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "test-stub";
    const mod = await import("@/lib/gemini/client");
    expect(mod.genAI).toBeDefined();
  });
});

describe("Gemini tools", () => {
  it("toolDeclarations exports four tools", async () => {
    const { toolDeclarations } = await import("@/lib/gemini/tools");
    expect(toolDeclarations).toHaveLength(4);
    const names = toolDeclarations.map((t) => t.name);
    expect(names).toContain("get_terminals");
    expect(names).toContain("get_routes");
    expect(names).toContain("get_fare");
    expect(names).toContain("get_route_details");
  });

  it("tool declarations use SchemaType enum values", async () => {
    const { toolDeclarations } = await import("@/lib/gemini/tools");
    const { SchemaType } = await import("@google/generative-ai");
    for (const tool of toolDeclarations) {
      expect(tool.parameters?.type).toBe(SchemaType.OBJECT);
    }
  });
});

describe("System prompt", () => {
  it("SYSTEM_PROMPT is a non-empty string", async () => {
    const { SYSTEM_PROMPT } = await import("@/lib/gemini/system-prompt");
    expect(typeof SYSTEM_PROMPT).toBe("string");
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });
});
```

---

### Task 6 — Commit and open PR

```bash
git add lib/gemini/
git add app/api/chat/
git add components/chat/
git add "app/(user)/chat/page.tsx"
git add tests/chat.test.ts
git add package.json pnpm-lock.yaml

git commit -m "phase-5: Gemini AI chatbot with function-calling and streamed responses"

git push -u origin phase-05-ai-chatbot

gh pr create \
  --title "phase-5: AI chatbot (Gemini, function-calling, streamed)" \
  --body "$(cat <<'EOF'
## Summary
- lib/gemini/client.ts: GoogleGenerativeAI instance (gemini-2.0-flash)
- lib/gemini/system-prompt.ts: TaxiFlow-scoped system prompt
- lib/gemini/tools.ts: 4 function-calling tools backed by Supabase queries
- app/api/chat/route.ts: POST handler — auth, AI toggle, multi-turn function loop, streaming
- components/chat/: ChatWindow + ChatMessage (react-markdown) + ChatInput
- app/(user)/chat/page.tsx: server component with session history + disabled state
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
- [ ] History reloads on page refresh
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
# "Tell me about the Merkato to Megenagna route" → 8.5 km, 25 min, $2.50, Piassa stop
# Refresh page → messages reload from DB
# Disable AI in system_settings → disabled state shown to user
# Lighthouse: chat page first contentful paint < 2s
```

**All pass = Phase 5 complete.**

---

## 5.5 Common failure modes

**`GEMINI_API_KEY is not set` error on startup.**
The key throws at module initialisation time (not lazily). Confirm the `.env.local` line has no extra spaces and no quotes around the value:
```
GEMINI_API_KEY=AIzaSy...
```
Restart `pnpm dev` after editing `.env.local`.

**`SchemaType` import causes TS error `"object" not assignable to SchemaType`.**
Plain string literals `"object"` and `"string"` are not valid for Gemini tool `parameters.type`. Import `SchemaType` from `@google/generative-ai` and use `SchemaType.OBJECT` / `SchemaType.STRING`.

**Function-calling loop runs but Gemini never returns text.**
The model may be stuck calling tools repeatedly. Check that each tool executor returns a deterministic object (never throws, never returns `undefined`). The loop has a hard limit of 5 rounds — if all 5 exhaust, `finalText` stays empty and nothing is streamed. Add a fallback: `finalText = finalText || "I wasn't able to complete that request."`.

**`Content[]` type errors mixing part shapes (text vs functionCall vs functionResponse).**
TypeScript infers a narrow type for the `contents` array from the first element. Declare it explicitly as `let contents: Content[]` (import `Content` from `@google/generative-ai`). Cast mixed-part turns with `as Content`.

**Streaming response is empty in the browser.**
Check that the API route returns `Content-Type: text/plain; charset=utf-8` and **not** `application/json`. The client reads raw bytes with a `ReadableStreamDefaultReader` — JSON framing would corrupt the stream. Also ensure no response compression middleware is double-encoding the body.

**`react-markdown` ESM error during build.**
`react-markdown` v9+ is ESM-only. Next.js 16 handles this natively in the App Router. If you see an `ERR_REQUIRE_ESM` error, add `"react-markdown"` to `transpilePackages` in `next.config.ts`:
```ts
transpilePackages: ["react-markdown"],
```

**429 Too Many Requests from Gemini.**
The free tier on `gemini-2.0-flash` is 60 RPM. In development, rapid re-sends can hit this. The Route Handler includes a specific 429 message: *"I'm receiving too many requests right now. Please try again in a moment."* If this happens in testing, wait 60 seconds and retry.

**Chat history missing on page refresh.**
The server component loads the most recent `session_id` from `chat_logs`. If `chat_logs` has no rows for the user (e.g. RLS block), it falls back to `crypto.randomUUID()` and history appears empty. Verify RLS: `chat_logs_select` allows `auth.uid() = user_id`. Check with: `SELECT * FROM chat_logs WHERE user_id = '<alice-uuid>' LIMIT 5;`

**`useEffect` / `useState` ESLint errors in chat components.**
The rule `react-hooks/set-state-in-effect` flags synchronous `setState` inside `useEffect` bodies. Any early-return `setState` calls (e.g. for fallback states) should be moved to lazy state initialisers: `useState(() => condition ? "fallback" : "default")`.

---

## 5.6 What's NOT in Phase 5

- ❌ Streaming token-by-token from Gemini (uses chunk simulation; true SSE streaming is Phase 10 polish)
- ❌ Tool: `get_trip_status` (requires Phase 6 trip tracking)
- ❌ Tool: `get_directions` (ORS directions in chat — deferred; route_details returns DB distance/duration)
- ❌ Multi-session switching UI (users always continue the most recent session)
- ❌ Admin chat log viewer (Phase 8)
- ❌ File/image uploads to the chat
- ❌ Voice input / text-to-speech

---

## 5.7 When you're done

Reply with:
1. Confirmation that all acceptance checks passed (or deviations and why).
2. The PR URL.
3. Any changes made vs. the spec and why.
4. Sample exchange screenshot or transcript showing a fare query resolved with a real DB value.

I'll then write `PHASE-06-trip-tracking.md`.
