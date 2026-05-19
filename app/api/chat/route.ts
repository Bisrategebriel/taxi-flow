// FR-AI-01..08, FR-CB-01..08, NFR-PE-03
import { NextRequest } from "next/server";
import { FunctionCallingMode } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { genAI } from "@/lib/gemini/client";
import { toolDeclarations, executeFunction } from "@/lib/gemini/tools";
import { SYSTEM_PROMPT } from "@/lib/gemini/system-prompt";

export async function POST(req: NextRequest) {
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

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: toolDeclarations }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  });

  // Convert stored history to Gemini format (DB role "assistant" → Gemini "model")
  const geminiHistory = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let finalText = "";

      try {
        // Build full contents array: history + new user message
        let contents: Content[] = [
          ...geminiHistory,
          { role: "user", parts: [{ text: message }] },
        ];

        // Function-calling loop — runs until Gemini returns plain text
        for (let round = 0; round < 5; round++) {
          const result = await model.generateContent({ contents });
          const response = result.response;
          const candidate = response.candidates?.[0];
          if (!candidate) break;

          const functionCalls = response.functionCalls();
          if (!functionCalls || functionCalls.length === 0) {
            // No more tool calls — we have the final answer
            finalText = response.text();
            break;
          }

          // Append model's function-call turn to history
          contents = [...contents, { role: "model", parts: candidate.content.parts } as Content];

          // Execute all requested functions in parallel
          const fnResponses = await Promise.all(
            functionCalls.map(async (fc) => {
              const result = await executeFunction(
                fc.name,
                (fc.args ?? {}) as Record<string, unknown>,
                supabase
              );
              return { functionResponse: { name: fc.name, response: result } };
            })
          );

          // Append function results as a user turn
          contents = [...contents, { role: "user", parts: fnResponses } as Content];
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
        // Graceful fallback (NFR-RE-06)
        const msg =
          err instanceof Error && err.message.includes("429")
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
