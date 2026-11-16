import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
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

  // The signed-in session above only proves who the caller is — the
  // function itself is service_role-only, so the write goes through the
  // admin client. user.id comes from the verified session, never from
  // the request body, so a caller can only mark their own welcome email.
  try {
    const { error } = await createAdminClient().rpc("mark_onboarding_email_sent", {
      p_user_id: user.id,
      p_email_key: step.key,
    });
    if (error) console.error("mark_onboarding_email_sent (welcome) failed:", error);
  } catch (error) {
    // The email already went out; the daily cron will pick this user up
    // as a "welcome" candidate and dedupe, so don't fail the request.
    console.error("mark_onboarding_email_sent (welcome): admin client unavailable:", error);
  }

  return Response.json({ sent: true });
}
