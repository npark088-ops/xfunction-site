import { Gauge as GaugeIcon } from "lucide-react";
import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { getAiUsageSnapshot, getChatUsageSnapshot } from "../../../lib/ai-usage";
import { getCanvasConnection } from "../../../lib/canvas-token-store";
import { getUnlockedAchievementIds } from "../../../lib/achievements";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { calculateCurrentGrade } from "../../../lib/grade-calculator";
import { projectFinalGrade } from "../../../lib/grade-projection";
import { evaluatePrediction, accuracyLabel } from "../../../lib/grade-prediction-accuracy";
import { SettingsContent } from "../../../components/SettingsContent";
import { ParentAccessCard, type ParentLink } from "../../../components/ParentAccessCard";

const card = "var(--card)";
const border = "var(--border)";
const green = "var(--green)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

// Server component — email, plan/usage status, and achievement unlock
// state are all known before the page ever reaches the browser, so
// there's no loading flash for any of it. Only the toggles/checkout
// button/digest test-send need interactivity, which is what
// SettingsContent (client) handles.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  const user = await getCachedUser();

  let isPro = false;
  let used = 0;
  let limit = 3;
  let chatUsed = 0;
  let chatLimit = 10;
  let unlockedIds: string[] = [];
  let parentLinks: ParentLink[] = [];
  let predictionSummary: { totalBaselines: number; comparableCount: number; avgDiff: number | null } = {
    totalBaselines: 0,
    comparableCount: 0,
    avgDiff: null,
  };

  if (user) {
    const supabase = await createClient();

    const [usage, chatUsage, profileRow, canvasConnection, parentLinksRow, predictionsRow] = await Promise.all([
      getAiUsageSnapshot(supabase, user.id),
      getChatUsageSnapshot(supabase, user.id),
      supabase
        .from("profiles")
        .select("longest_streak, first_study_plan_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      getCanvasConnection(supabase, user.id),
      supabase
        .from("parent_links")
        .select("id, parent_email, status, invite_code, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("grade_predictions")
        .select("course_id, predicted_grade, percent_graded_at_prediction, created_at"),
    ]);

    isPro = usage.isPro;
    used = usage.used;
    limit = usage.limit;
    chatUsed = chatUsage.used;
    chatLimit = chatUsage.limit;

    const unlocked = getUnlockedAchievementIds({
      longestStreak: profileRow.data?.longest_streak ?? 0,
      hasGeneratedStudyPlan: Boolean(profileRow.data?.first_study_plan_at),
      canvasConnected: Boolean(canvasConnection),
    });
    unlockedIds = Array.from(unlocked);
    parentLinks = parentLinksRow.data ?? [];

    // Cross-course "how accurate has the AI been" indicator — same
    // evaluatePrediction() logic as the per-course card on the Grades
    // page (see lib/grade-prediction-accuracy.ts), just averaged across
    // every course with a logged baseline instead of showing just one.
    const predictionRows = predictionsRow.data ?? [];
    const evaluations = predictionRows
      .map((row) => {
        const course = mockCourses[row.course_id];
        if (!course) return null;
        const liveGrade = calculateCurrentGrade(course.assignmentGroups);
        const livePercentGraded = projectFinalGrade(course.assignmentGroups).percentGraded;
        return evaluatePrediction(row, liveGrade, livePercentGraded);
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    const comparable = evaluations.filter((e) => e.comparable && e.diff !== null);
    predictionSummary = {
      totalBaselines: evaluations.length,
      comparableCount: comparable.length,
      avgDiff:
        comparable.length > 0
          ? Math.round((comparable.reduce((sum, e) => sum + (e.diff as number), 0) / comparable.length) * 10) / 10
          : null,
    };
  }

  return (
    <div
      className="xf-page-enter"
      style={{
        minHeight: "100vh",
        color: text,
        fontFamily: "Inter, sans-serif",
        padding: "48px 40px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 8,
            color: textDim,
            fontSize: 13,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          XFunction · Settings
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em", color: text }}>
          Settings
        </h1>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Manage your account and notification preferences.
        </p>

        <SettingsContent
          userEmail={user?.email ?? null}
          isPro={isPro}
          used={used}
          limit={limit}
          chatUsed={chatUsed}
          chatLimit={chatLimit}
          justUpgraded={upgraded === "1"}
          unlockedAchievementIds={unlockedIds}
        />

        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
            padding: 28,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 19,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 12,
              color: text,
            }}
          >
            <GaugeIcon size={17} strokeWidth={2} />
            AI prediction accuracy
          </h2>
          {predictionSummary.totalBaselines === 0 && (
            <p style={{ fontSize: 13, color: textDim, lineHeight: 1.5, margin: 0 }}>
              Once you view a course&apos;s semester-end grade projection, we&apos;ll start tracking how
              accurate it turns out to be here.
            </p>
          )}
          {predictionSummary.totalBaselines > 0 && predictionSummary.comparableCount === 0 && (
            <p style={{ fontSize: 13, color: textDim, lineHeight: 1.5, margin: 0 }}>
              Tracking {predictionSummary.totalBaselines} grade prediction
              {predictionSummary.totalBaselines === 1 ? "" : "s"} so far, but none have enough newly-graded
              assignments yet to check accuracy against.
            </p>
          )}
          {predictionSummary.comparableCount > 0 && predictionSummary.avgDiff !== null && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 22,
                    fontWeight: 600,
                    color: predictionSummary.avgDiff <= 5 ? green : predictionSummary.avgDiff <= 10 ? "var(--amber)" : red,
                  }}
                >
                  {accuracyLabel(predictionSummary.avgDiff)}
                </div>
                <div style={{ fontSize: 13, color: textDim }}>
                  within {predictionSummary.avgDiff.toFixed(1)} points on average
                </div>
              </div>
              <p style={{ fontSize: 13, color: textDim, lineHeight: 1.5, margin: 0 }}>
                Based on {predictionSummary.comparableCount} course prediction
                {predictionSummary.comparableCount === 1 ? "" : "s"} checked against your actual grade so
                far, out of {predictionSummary.totalBaselines} tracked.
              </p>
            </>
          )}
        </div>

        <ParentAccessCard initialLinks={parentLinks} userEmail={user?.email ?? null} />
      </div>
    </div>
  );
}
