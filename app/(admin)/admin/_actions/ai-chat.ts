"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  return user;
}

export async function updateSessionStatus(
  sessionId: string,
  userId: string,
  status: "active" | "resolved" | "escalated"
): Promise<void> {
  await assertAdmin();
  const service = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any).from("chat_sessions").upsert(
    { session_id: sessionId, user_id: userId, status, updated_at: new Date().toISOString() },
    { onConflict: "session_id" }
  );
  revalidatePath("/admin/ai-chat");
}

export type ReplyState = { error?: string; success?: boolean };

export async function sendAdminReply(
  _prev: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  await assertAdmin();

  const sessionId = (formData.get("session_id") as string)?.trim();
  const userId = (formData.get("user_id") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const markResolved = formData.get("mark_resolved") === "1";

  if (!content) return { error: "Reply cannot be empty." };
  if (!sessionId || !userId) return { error: "Invalid session." };

  const service = createServiceClient();

  const { error } = await service.from("chat_logs").insert({
    session_id: sessionId,
    user_id: userId,
    role: "assistant",
    content,
  });

  if (error) return { error: error.message };

  if (markResolved) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).from("chat_sessions").upsert(
      { session_id: sessionId, user_id: userId, status: "resolved", updated_at: new Date().toISOString() },
      { onConflict: "session_id" }
    );
  }

  revalidatePath("/admin/ai-chat");
  return { success: true };
}
