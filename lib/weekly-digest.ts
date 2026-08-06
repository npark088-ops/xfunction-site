import { mockCourses, getCreditHours } from "./mock-canvas-data";
import { calculateCurrentGrade, calculateWeightedOverallGrade } from "./grade-calculator";
import { getOverallGradeHistory, trendDirection, type GradePoint } from "./grade-history";
import { getUpcomingAssignments, type UpcomingAssignment } from "./upcoming-assignments";

export interface DigestData {
  overallGrade: number;
  trend: ReturnType<typeof trendDirection>;
  upcoming: UpcomingAssignment[];
  coachHighlight: string | null;
}

function daysAwayLabel(daysAway: number) {
  if (daysAway <= 0) return "due today";
  if (daysAway === 1) return "due tomorrow";
  return `due in ${daysAway} days`;
}

// Shared by both digest routes (on-demand and cron) so they never
// disagree on what "this week's" grade/trend/upcoming numbers are.
export function composeDigestData(coachHighlight: string | null): DigestData {
  const courses = Object.values(mockCourses).map((course) => ({
    grade: calculateCurrentGrade(course.assignmentGroups),
    creditHours: getCreditHours(course),
  }));
  const overallGrade = calculateWeightedOverallGrade(courses);
  const history: GradePoint[] = getOverallGradeHistory(overallGrade);
  const trend = trendDirection(history);
  const upcoming = getUpcomingAssignments(7);

  return { overallGrade, trend, upcoming, coachHighlight };
}

function trendLabel(trend: DigestData["trend"]) {
  if (trend === "up") return "↑ Improving";
  if (trend === "down") return "↓ Declining";
  return "→ Steady";
}

export function buildDigestEmail(data: DigestData): { subject: string; html: string } {
  const upcomingHtml =
    data.upcoming.length === 0
      ? "<p>Nothing due in the next 7 days. 🎉</p>"
      : `<ul>${data.upcoming
          .map(
            (a) =>
              `<li><strong>${a.courseName}</strong> — ${a.assignmentName} (${daysAwayLabel(a.daysAway)})</li>`
          )
          .join("")}</ul>`;

  const coachHtml = data.coachHighlight
    ? `<h2>Coach highlight</h2><p>${data.coachHighlight}</p>`
    : "";

  const html = `
    <h1>Your weekly xFunction digest</h1>
    <h2>Overall grade</h2>
    <p>${data.overallGrade.toFixed(1)}% (${trendLabel(data.trend)})</p>
    <h2>Coming up this week</h2>
    ${upcomingHtml}
    ${coachHtml}
  `;

  return {
    subject: `Your weekly check-in — ${data.overallGrade.toFixed(1)}% overall`,
    html,
  };
}

// Sends via onboarding@resend.dev, Resend's shared test sender — same
// single-recipient restriction documented in app/api/send-reminders:
// it can only deliver to the email address the Resend account itself
// is registered under, until a verified sending domain is set up.
export async function sendDigestEmail(
  to: string,
  data: DigestData
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return {
      ok: false,
      error: "Email sending isn't set up yet — RESEND_API_KEY is missing from the server.",
    };
  }

  const { subject, html } = buildDigestEmail(data);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "xFunction <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend digest send failed:", res.status, body);
      return { ok: false, error: "Failed to send digest email" };
    }

    return { ok: true };
  } catch (error) {
    console.error("Weekly digest email failed:", error);
    return { ok: false, error: "Failed to send digest email" };
  }
}
