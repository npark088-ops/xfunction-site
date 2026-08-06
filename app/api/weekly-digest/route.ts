import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/ai-usage";
import { generateCoachInsight } from "../../../lib/coach-insight";
import { composeDigestData, sendDigestEmail } from "../../../lib/weekly-digest";

// Authenticated, on-demand send — this is what the "Send me a test
// digest now" button in Settings calls, and is also a template for
// what a per-user digest would look like if this app ever grows real
// multi-user Canvas data (right now the grade data itself is the same
// shared mock dataset for everyone, so the only genuinely personal
// parts are the signed-in user's own email and AI quota).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  // The coach highlight draws from the same monthly AI quota as study
  // plans/guides/check-ins. If the user's out for the month, the
  // digest still sends — just without that one section — rather than
  // blocking the whole email over it.
  let coachHighlight: string | null = null;
  const usage = await consumeAiGeneration(supabase, user.id);
  if (usage.allowed) {
    try {
      coachHighlight = await generateCoachInsight();
    } catch (error) {
      console.error("Digest coach highlight failed:", error);
    }
  }

  const data = composeDigestData(coachHighlight);
  const result = await sendDigestEmail(user.email, data);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ sent: true });
}
