import { createClient } from "../../../../lib/supabase/server";
import { seedDemoData } from "../../../../lib/user-courses";

// "Load demo data" — see components/AddCourseCard.tsx on the Courses
// page. Only works on a genuinely empty account (enforced inside
// seedDemoData itself), so it always reads as "here's a starting
// point to explore/edit," never as silently merging fake courses into
// a student's real ones.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    await seedDemoData(supabase, user.id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Seed demo data failed:", error);
    const message = error instanceof Error ? error.message : "Failed to load demo data";
    return Response.json({ error: message }, { status: 400 });
  }
}
