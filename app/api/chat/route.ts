// FR-AI-01..08, FR-CB-01..08, NFR-PE-03
import { NextRequest } from "next/server";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { createClient } from "@/lib/supabase/server";
import { groq, GROQ_MODEL } from "@/lib/groq/client";
import { toolDeclarations, executeFunction } from "@/lib/groq/tools";
import { SYSTEM_PROMPT } from "@/lib/groq/system-prompt";

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return new Response("AI chat is not configured.", { status: 503 });
  }

  // Auth guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // AI toggle check (FR-AI-08)
  const { data: setting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "ai_chat_enabled")
    .single();
  if (setting?.value !== true && setting?.value !== "true") {
    return new Response("AI chat is currently disabled.", { status: 503 });
  }

  const { message, sessionId, history } = (await req.json()) as {
    message: string;
    sessionId: string;
    history: { role: string; content: string }[];
  };

  if (!message?.trim()) return new Response("Empty message", { status: 400 });

  // Save user message (FR-AI-06)
  await supabase.from("chat_logs").insert({
    user_id: user.id,
    session_id: sessionId,
    role: "user",
    content: message,
  });

  // Build message list: system + history + current user message
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let finalText = "";

      try {
        let currentMessages = messages;

        // Function-calling loop — runs until the model returns plain text
        for (let round = 0; round < 5; round++) {
          const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: currentMessages,
            tools: toolDeclarations,
            tool_choice: "auto",
            parallel_tool_calls: false,
            max_tokens: 1024,
          });

          const choice = completion.choices[0];
          if (!choice) break;

          const assistantMsg = choice.message;

          if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
            finalText = assistantMsg.content ?? "";
            break;
          }

          // Append the assistant's tool-call turn
          // Normalize content: undefined → null (Groq rejects undefined in round 2)
          currentMessages = [
            ...currentMessages,
            { ...assistantMsg, content: assistantMsg.content ?? null } as ChatCompletionMessageParam,
          ];

          // Execute all tool calls in parallel and append results
          const toolResponses = await Promise.all(
            assistantMsg.tool_calls.map(async (tc) => {
              const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
              const result = await executeFunction(tc.function.name, args, supabase);
              return {
                role: "tool" as const,
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              };
            })
          );

          currentMessages = [...currentMessages, ...toolResponses];
        }

        // Stream the final text in ~40-char chunks (NFR-PE-03: first token < 3s)
        if (finalText) {
          const chunkSize = 40;
          for (let i = 0; i < finalText.length; i += chunkSize) {
            controller.enqueue(encoder.encode(finalText.slice(i, i + chunkSize)));
            await new Promise((r) => setTimeout(r, 15));
          }
        }
      } catch (err) {
        console.error("[chat/route] Groq error:", err);
        const errMsg = err instanceof Error ? err.message : "";
        const msg = errMsg.includes("429") || errMsg.includes("rate_limit")
          ? "I'm receiving too many requests right now. Please try again in a moment."
          : "Sorry, I ran into a problem. Please try again.";
        controller.enqueue(encoder.encode(msg));
        finalText = msg;
      }

      // Save assistant response (FR-AI-06)
      if (finalText) {
        await supabase.from("chat_logs").insert({
          user_id: user.id,
          session_id: sessionId,
          role: "assistant",
          content: finalText,
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
