// Onboarding email sequence: one welcome email right after signup, then
// up to three spaced-out nudges over the first week, each skippable if
// the student's already taken the action it's nudging toward. Steps are
// read by the daily cron (see app/api/cron/onboarding-emails) via the
// get_onboarding_email_candidates() RPC (supabase/migrations/0017_onboarding_emails.sql),
// which is also what "hasn't happened yet" (canvas_connected, has_study_plan) comes from.
//
// Sends via the same onboarding@resend.dev shared sender as
// lib/weekly-digest.ts — meaning it's currently limited to whatever
// single address the Resend account itself is registered under, until
// a verified sending domain replaces it. That's a real gap for a
// feature meant to reach every new student, not one fixed inbox — see
// the route's doc comment for how failures are handled meanwhile.

export interface OnboardingCandidate {
  user_id: string;
  email: string;
  canvas_connected: boolean;
  has_study_plan: boolean;
}

export interface OnboardingStep {
  key: string;
  minAgeHours: number;
  subject: string;
  html: string;
  skip?: (candidate: OnboardingCandidate) => boolean;
}

const cta = (href: string, label: string) =>
  `<p style="margin-top:20px;"><a href="${href}" style="display:inline-block;background:#3D6BFF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">${label}</a></p>`;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://xfunction-live.vercel.app";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: "welcome",
    minAgeHours: 0,
    subject: "Welcome to XFunction 👋",
    html: `
      <h1>Welcome to XFunction</h1>
      <p>You're in. XFunction turns your Canvas grades into a clear, day-by-day plan — no more guessing what to study or how a missed assignment will hit your grade.</p>
      <p>A couple of things worth doing first:</p>
      <ul>
        <li>Connect Canvas so your courses show up automatically</li>
        <li>Generate your first AI study plan for an upcoming test</li>
        <li>Ask <strong>Your Consultant</strong> — our AI advisor — anything about your current grades</li>
      </ul>
      ${cta(`${APP_URL}/overview`, "Go to your dashboard")}
    `,
  },
  {
    key: "connect_canvas",
    minAgeHours: 24,
    subject: "Haven't connected Canvas yet?",
    skip: (c) => c.canvas_connected,
    html: `
      <h1>Quick one — connect Canvas</h1>
      <p>XFunction is most useful once it can see your real courses and assignments. Connecting Canvas takes under a minute and unlocks grade tracking, deadline reminders, and AI study plans built around your actual work.</p>
      ${cta(`${APP_URL}/courses`, "Connect Canvas")}
    `,
  },
  {
    key: "try_ai_study_plan",
    minAgeHours: 72,
    subject: "Try your first AI study plan",
    skip: (c) => c.has_study_plan,
    html: `
      <h1>Let AI build your study plan</h1>
      <p>Pick any upcoming test or assignment and XFunction will lay out a day-by-day plan leading up to it — prioritized around what's actually going to be tested, not generic advice.</p>
      ${cta(`${APP_URL}/courses`, "Generate a study plan")}
    `,
  },
  {
    key: "week_wrapup",
    minAgeHours: 168,
    subject: "A few things you might've missed",
    html: `
      <h1>One week in</h1>
      <p>A few XFunction features that are easy to miss:</p>
      <ul>
        <li><strong>Your Consultant</strong> — a chat advisor grounded in your real grades ("am I going to pass this class?")</li>
        <li><strong>Compare</strong> — see all your courses side by side</li>
        <li><strong>Parent view</strong> — let a parent or guardian follow along, from Settings</li>
        <li><strong>Dark mode</strong> — toggle it in Settings → Appearance</li>
      </ul>
      ${cta(`${APP_URL}/overview`, "Explore your dashboard")}
    `,
  },
];

export async function sendOnboardingEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return {
      ok: false,
      error: "Email sending isn't set up yet — RESEND_API_KEY is missing from the server.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "XFunction <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend onboarding email failed:", res.status, body);
      return { ok: false, error: "Failed to send onboarding email" };
    }

    return { ok: true };
  } catch (error) {
    console.error("Onboarding email failed:", error);
    return { ok: false, error: "Failed to send onboarding email" };
  }
}
