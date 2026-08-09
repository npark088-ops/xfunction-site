import { getGoogleClassroomConnection } from "../../../../lib/google-classroom-token-store";
import { createClient } from "../../../../lib/supabase/server";

// This endpoint is ours, not Google's — same as /api/canvas/status.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false, user: null });
  }

  const connection = await getGoogleClassroomConnection(supabase, user.id);

  return Response.json({
    connected: Boolean(connection),
    user: connection ? { id: connection.google_user_id, name: connection.google_user_name } : null,
  });
}
