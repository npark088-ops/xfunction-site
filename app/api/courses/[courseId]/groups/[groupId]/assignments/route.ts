import { NextRequest } from "next/server";
import { createClient } from "../../../../../../../lib/supabase/server";
import { createAssignment } from "../../../../../../../lib/user-courses";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { groupId } = await params;
  const { name, pointsPossible, dueAt, score } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "An assignment name is required." }, { status: 400 });
  }
  const points = Number(pointsPossible);
  if (!Number.isFinite(points) || points <= 0) {
    return Response.json({ error: "Points possible must be a positive number." }, { status: 400 });
  }

  try {
    const id = await createAssignment(supabase, user.id, Number(groupId), {
      name: name.trim(),
      pointsPossible: points,
      dueAt: typeof dueAt === "string" && dueAt ? dueAt : null,
      score: score === "" || score == null ? null : Number(score),
    });
    return Response.json({ id });
  } catch (error) {
    console.error("Create assignment failed:", error);
    return Response.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
