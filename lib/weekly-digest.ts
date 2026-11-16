import type { MockCourse } from "./mock-canvas-data";
import { EMAIL_DISABLED_MESSAGE, emailSendingEnabled, getEmailSender } from "./email-config";
import { getCreditHours } from "./mock-canvas-data";
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
export function composeDigestData(
  coachHighlight: string | null,
  courseMap: Record<string, MockCourse>,
  timeZone: string = "UTC"
): DigestData {
  const courses = Object.values(courseMap).map((course) => ({
    grade: calculateCurrentGrade(course.assignmentGroups),
    creditHours: getCreditHours(course),
  }));
  const overallGrade = calculateWeightedOverallGrade(courses);
  const history: GradePoint[] = getOverallGradeHistory(overallGrade, Object.keys(courseMap));
  const trend = trendDirection(history);
  const upcoming = getUpcomingAssignments(courseMap, 7, timeZone);

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
    <h1>Your weekly XFunction digest</h1>
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

// Sends from the EMAIL_FROM address; does nothing until one is configured
// (see lib/email-config.ts).
export async function sendDigestEmail(
  to: string,
  data: DigestData
): Promise<{ ok: boolean; error?: string }> {
  if (!emailSendingEnabled()) {
    return { ok: false, error: EMAIL_DISABLED_MESSAGE };
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
        from: getEmailSender(),
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
