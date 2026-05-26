import { createServiceClient } from "@/lib/supabase/service";

/**
 * Insert a targeted notification for a specific user into admin_notifications.
 * Uses service client so it works from any API route or server action.
 */
export async function insertUserNotification(
  userId: string,
  title: string,
  body: string,
  type: "info" | "success" | "warning" | "decline" | "alert" | "reminder" | "promotional" = "info"
): Promise<void> {
  const service = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any).from("admin_notifications").insert({
    title,
    body,
    type,
    target: userId,
    sent_count: 1,
    read_count: 0,
  });
}
