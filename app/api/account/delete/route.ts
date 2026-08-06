import { createClient } from "../../../../lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    console.error("delete_own_account failed:", error);
    return Response.json({ error: "Failed to delete account" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
