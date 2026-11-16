import { NextRequest } from "next/server";
import { createClient } from "../../../../../../../../lib/supabase/server";
import { updateAssignment, deleteAssignment } from "../../../../../../../../lib/user-courses";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { assignmentId } = await params;
  const { name, pointsPossible, dueAt, score } = await req.json();

  try {
    await updateAssignment(supabase, user.id, Number(assignmentId), {
      ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      ...(Number.isFinite(Number(pointsPossible)) ? { pointsPossible: Number(pointsPossible) } : {}),
      ...(dueAt !== undefined ? { dueAt: typeof dueAt === "string" && dueAt ? dueAt : null } : {}),
      ...(score !== undefined ? { score: score === "" || score == null ? null : Number(score) } : {}),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Update assignment failed:", error);
    return Response.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { assignmentId } = await params;

  try {
    await deleteAssignment(supabase, user.id, Number(assignmentId));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Delete assignment failed:", error);
    return Response.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
