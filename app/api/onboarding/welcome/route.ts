import { createClient } from "../../../../lib/supabase/server";
import { ONBOARDING_STEPS, sendOnboardingEmail } from "../../../../lib/onboarding-emails";

// Fired once, fire-and-forget, right after a successful signup (see
// app/login/page.tsx) so the welcome email goes out immediately rather
// than waiting for the next daily cron pass. mark_onboarding_email_sent
// is idempotent, so if this call fails to fire (or the tab closes mid-request),
// the "welcome" step's minAgeHours: 0 makes it a normal candidate for
// app/api/cron/onboarding-emails the next time it runs — no state is lost,
// just delayed.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const step = ONBOARDING_STEPS.find((s) => s.key === "welcome")!;
  const result = await sendOnboardingEmail(user.email, step.subject, step.html);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  const { error } = await supabase.rpc("mark_onboarding_email_sent", {
    p_user_id: user.id,
    p_email_key: step.key,
  });
  if (error) console.error("mark_onboarding_email_sent (welcome) failed:", error);

  return Response.json({ sent: true });
}
