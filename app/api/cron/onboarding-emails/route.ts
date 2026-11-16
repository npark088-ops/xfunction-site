import { createAdminClient } from "../../../../lib/supabase/admin";
import { ONBOARDING_STEPS, sendOnboardingEmail, type OnboardingCandidate } from "../../../../lib/onboarding-emails";
import { emailSendingEnabled } from "../../../../lib/email-config";

// Triggered daily by Vercel Cron (see vercel.json). No signed-in user
// exists in this context — same as app/api/cron/weekly-digest — so
// candidates come from the SECURITY DEFINER RPCs in
// supabase/migrations/0017_onboarding_emails.sql, called through the
// server-only service-role client (those functions are executable by
// service_role only — they return user emails, so they must never be
// reachable with the public anon key).
//
// Email is OFF until a verified sender is configured (EMAIL_FROM, see
// lib/email-config.ts): the route then answers "skipped" and does nothing. Once
// it is on, the step logic, skip conditions and dedupe below are all ready.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // No verified sender configured (EMAIL_FROM, see lib/email-config.ts): do
  // nothing. Returns before any lookup, so no student is marked as "emailed"
  // and everyone is still a candidate once email is switched on.
  if (!emailSendingEnabled()) {
    return Response.json({ ok: true, skipped: true, reason: "Email sending isn't configured (EMAIL_FROM)." });
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error("Onboarding cron: admin client unavailable:", error);
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }

  const results: Record<string, { sent: number; skipped: number; failed: number }> = {};

  for (const step of ONBOARDING_STEPS) {
    const summary = { sent: 0, skipped: 0, failed: 0 };

    const { data: candidates, error } = await supabase.rpc("get_onboarding_email_candidates", {
      p_email_key: step.key,
      p_min_age_hours: step.minAgeHours,
    });

    if (error) {
      console.error(`get_onboarding_email_candidates(${step.key}) failed:`, error);
      results[step.key] = summary;
      continue;
    }

    for (const candidate of (candidates ?? []) as OnboardingCandidate[]) {
      if (step.skip?.(candidate)) {
        summary.skipped++;
        continue;
      }

      const sendResult = await sendOnboardingEmail(candidate.email, step.subject, step.html);
      if (!sendResult.ok) {
        // Not marked as sent — stays a candidate so a fixed sender
        // config picks it up on a later run instead of losing it.
        summary.failed++;
        continue;
      }

      const { error: markError } = await supabase.rpc("mark_onboarding_email_sent", {
        p_user_id: candidate.user_id,
        p_email_key: step.key,
      });
      if (markError) console.error("mark_onboarding_email_sent failed:", markError);
      summary.sent++;
    }

    results[step.key] = summary;
  }

  return Response.json({ ok: true, results });
}
