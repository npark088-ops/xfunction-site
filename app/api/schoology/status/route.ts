import { getSchoologyConnection } from "../../../../lib/schoology-token-store";
import { createClient } from "../../../../lib/supabase/server";

// This endpoint is ours, not Schoology's — same as /api/canvas/status.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false, user: null });
  }

  const connection = await getSchoologyConnection(supabase, user.id);

  return Response.json({
    connected: Boolean(connection),
    user: connection
      ? { id: connection.schoology_user_id, name: connection.schoology_user_name ?? "Schoology user" }
      : null,
  });
}
