import "server-only";
import { createAdminClient } from "./supabase/admin";

// One saved coach check-in per user per local day (table coach_tips, see
// supabase/pending/0027_coach_tip_cache.sql). The point: a student opening the
// dashboard five times a day should cost ONE AI generation, not five.
//
// Both functions are best-effort. If the table doesn't exist yet (SQL not run)
// or the database hiccups, reading returns "no saved tip" and saving does
// nothing; the browser-side cache in the Overview page still keeps repeat
// visits from the same device free.

export async function getCachedCoachTip(userId: string, tipDate: string): Promise<string | null> {
  try {
    const { data, error } = await createAdminClient()
      .from("coach_tips")
      .select("insight")
      .eq("user_id", userId)
      .eq("tip_date", tipDate)
      .maybeSingle();
    if (error) return null;
    return (data?.insight as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveCoachTip(userId: string, tipDate: string, insight: string): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("coach_tips")
      .upsert({ user_id: userId, tip_date: tipDate, insight }, { onConflict: "user_id,tip_date", ignoreDuplicates: true });
    if (error) console.error("saveCoachTip failed:", error.message);
  } catch (error) {
    console.error("saveCoachTip failed:", error);
  }
}
