import { NextRequest } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { createGroup } from "../../../../../lib/user-courses";

export async function POST(
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
  const { name, weight } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "A category name is required." }, { status: 400 });
  }
  const weightNum = Number(weight);
  if (!Number.isFinite(weightNum) || weightNum <= 0) {
    return Response.json({ error: "Weight must be a positive number." }, { status: 400 });
  }

  try {
    const id = await createGroup(supabase, user.id, courseId, { name: name.trim(), weight: weightNum });
    return Response.json({ id });
  } catch (error) {
    console.error("Create assignment group failed:", error);
    return Response.json({ error: "Failed to create category" }, { status: 500 });
  }
}
