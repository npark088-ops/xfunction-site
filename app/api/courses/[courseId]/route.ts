import { NextRequest } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { updateCourse, deleteCourse } from "../../../../lib/user-courses";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { courseId } = await params;
  const { name, creditHours, gradingScale } = await req.json();

  try {
    await updateCourse(supabase, user.id, courseId, {
      ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      ...(Number.isFinite(Number(creditHours)) ? { creditHours: Number(creditHours) } : {}),
      ...(gradingScale === "simple" || gradingScale === "standard" ? { gradingScale } : {}),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Update course failed:", error);
    return Response.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { courseId } = await params;

  try {
    await deleteCourse(supabase, user.id, courseId);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Delete course failed:", error);
    return Response.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
