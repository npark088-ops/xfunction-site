import { createClient } from "@supabase/supabase-js";
import { ONBOARDING_STEPS, sendOnboardingEmail, type OnboardingCandidate } from "../../../../lib/onboarding-emails";

// Triggered daily by Vercel Cron (see vercel.json). No signed-in user
// exists in this context — same as app/api/cron/weekly-digest — so
// candidates come from the SECURITY DEFINER RPCs in
// supabase/migrations/0017_onboarding_emails.sql instead of a normal
// cookie-scoped query.
//
// IMPORTANT: like the weekly digest, this sends through Resend's shared
// onboarding@resend.dev sender, which can only deliver to the address
// the Resend account itself is registered under until a verified
// sending domain is set up. Right now that means real students will
// NOT receive these emails in production — only whatever single inbox
// Resend is configured against will. The step logic, skip conditions,
// and dedupe below are all real and ready to go the moment a verified
// domain replaces the sandbox sender; nothing here needs to change,
// this route just needs Resend's sending restriction lifted.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
