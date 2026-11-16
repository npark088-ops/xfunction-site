import { NextRequest } from "next/server";
import { createClient } from "../../../../../../lib/supabase/server";
import { updateGroup, deleteGroup } from "../../../../../../lib/user-courses";

export async function PATCH(
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
  const { name, weight } = await req.json();

  try {
    await updateGroup(supabase, user.id, Number(groupId), {
      ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      ...(Number.isFinite(Number(weight)) ? { weight: Number(weight) } : {}),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Update assignment group failed:", error);
    return Response.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
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

  try {
    await deleteGroup(supabase, user.id, Number(groupId));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Delete assignment group failed:", error);
    return Response.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
