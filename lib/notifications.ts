import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType = "achievement" | "deadline" | "ai-limit";

export interface NotificationRow {
  id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

// Idempotent insert — relies on the (user_id, dedupe_key) unique
// constraint (supabase/migrations/0007_notifications.sql) so calling
// this every time a condition is still true (e.g. "still an unlocked
// achievement") never creates duplicates. user_id fills in via the
// column default (auth.uid()), same pattern as assignment_completions.
export async function ensureNotification(
  supabase: SupabaseClient,
  params: { type: NotificationType; message: string; link?: string; dedupeKey: string }
) {
  const { error } = await supabase.from("notifications").upsert(
    {
      type: params.type,
      message: params.message,
      link: params.link ?? null,
      dedupe_key: params.dedupeKey,
    },
    { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
  );
  // PostgrestError doesn't serialize usefully via console.error's
  // default object formatting (shows as "{}" in Next's dev overlay) —
  // logging the fields directly actually shows what went wrong.
  if (error) {
    console.error("ensureNotification failed:", error.message, error.code, error.details);
  }
}

export async function getNotificationsSnapshot(
  supabase: SupabaseClient,
  limit = 15
): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
  const [{ data: notifications, error: listError }, { count, error: countError }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, message, link, read, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
  ]);

  if (listError) {
    console.error("getNotificationsSnapshot list failed:", listError.message, listError.code, listError.details);
  }
  if (countError) {
    console.error("getNotificationsSnapshot count failed:", countError.message, countError.code, countError.details);
  }

  return { notifications: notifications ?? [], unreadCount: count ?? 0 };
}

export async function markAllNotificationsRead(supabase: SupabaseClient) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
  if (error) {
    console.error("markAllNotificationsRead failed:", error.message, error.code, error.details);
  }
  return !error;
}
