import { createClient } from "../../../lib/supabase/server";
import { createCourse, seedDemoData } from "../../../lib/user-courses";

// Creates a genuinely new, empty manual course — see
// components/AddCourseCard.tsx (Courses page) and the Grades page's
// Manage tab (components/GradebookEditor.tsx), which adds categories
// and assignments to it afterward.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { name, creditHours, gradingScale } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "A course name is required." }, { status: 400 });
  }
  const scale = gradingScale === "simple" ? "simple" : "standard";
  const credits = Number(creditHours);

  try {
    const id = await createCourse(supabase, user.id, {
      name: name.trim(),
      creditHours: Number.isFinite(credits) && credits > 0 ? credits : 1,
      gradingScale: scale,
    });
    return Response.json({ id });
  } catch (error) {
    console.error("Create course failed:", error);
    return Response.json({ error: "Failed to create course" }, { status: 500 });
  }
}
