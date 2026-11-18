import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/profile-server";
import { generateCoachInsight } from "../../../lib/coach-insight";
import { getUserCourses } from "../../../lib/user-courses";
import { getCachedCoachTip, saveCoachTip } from "../../../lib/coach-cache";
import { getRequestTimeZone } from "../../../lib/request-tz";
import { localDate } from "../../../lib/local-date";
import { limitReachedResponse } from "../../../lib/ai-limit-response";

// The coach check-in. Spends a free AI generation ONLY when it really has to:
//   1. no courses yet      -> nothing to coach on; no AI call, nothing counted
//   2. already made today  -> reuse the saved tip (one per user per local day)
//   3. otherwise           -> count one generation, ask the AI, save the result
// "Today" is the student's own calendar day (time zone from lib/request-tz.ts),
// not UTC. Opening the dashboard repeatedly therefore costs at most one
// generation a day.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  let courses;
  try {
    courses = await getUserCourses(supabase, user.id);
  } catch (error) {
    console.error("Coach overview: loading courses failed:", error);
    return Response.json({ error: "Failed to generate check-in" }, { status: 500 });
  }

  if (Object.keys(courses).length === 0) {
    return Response.json({ insight: null, reason: "no-courses" });
  }

  const today = localDate(await getRequestTimeZone());

  const saved = await getCachedCoachTip(user.id, today);
  if (saved) {
    return Response.json({ insight: saved, cached: true });
  }

  const usage = await consumeAiGeneration(supabase);
  if (!usage.allowed) {
    return limitReachedResponse(usage);
  }

  try {
    const insight = await generateCoachInsight(courses, usage.isPro);
    await saveCoachTip(user.id, today, insight);
    return Response.json({ insight });
  } catch (error) {
    console.error("Coach overview generation failed:", error);
    return Response.json({ error: "Failed to generate check-in" }, { status: 500 });
  }
}
