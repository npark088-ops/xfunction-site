import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/ai-usage";
import { generateCoachInsight } from "../../../lib/coach-insight";
import { getUserCourses } from "../../../lib/user-courses";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const usage = await consumeAiGeneration(supabase, user.id);
  if (!usage.allowed) {
    return Response.json(
      {
        error: "upgrade_required",
        message: `You've used all ${usage.limit} free AI generations this month.`,
      },
      { status: 402 }
    );
  }

  try {
    const courses = await getUserCourses(supabase, user.id);
    const insight = await generateCoachInsight(courses, usage.isPro);
    return Response.json({ insight });
  } catch (error) {
    console.error("Coach overview generation failed:", error);
    return Response.json({ error: "Failed to generate check-in" }, { status: 500 });
  }
}
