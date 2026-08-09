import { clearGoogleClassroomToken } from "../../../../lib/google-classroom-token-store";
import { createClient } from "../../../../lib/supabase/server";

// Ours, not Google's. Real Google does support revoking a token
// (POST https://oauth2.googleapis.com/revoke), but for now this just
// removes our stored copy for the signed-in user, same as
// /api/canvas/disconnect.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false }, { status: 401 });
  }

  await clearGoogleClassroomToken(supabase, user.id);
  return Response.json({ connected: false });
}
