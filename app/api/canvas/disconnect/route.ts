import { clearCanvasToken } from "../../../../lib/canvas-token-store";
import { createClient } from "../../../../lib/supabase/server";

// Ours, not Canvas's. Real Canvas does support revoking a token
// (DELETE /login/oauth2/token), but for now this just removes our
// stored copy for the signed-in user.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false }, { status: 401 });
  }

  await clearCanvasToken(supabase, user.id);
  return Response.json({ connected: false });
}
