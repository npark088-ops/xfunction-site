import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { getAiUsageSnapshot } from "../../../lib/ai-usage";
import { getCanvasConnection } from "../../../lib/canvas-token-store";
import { getUnlockedAchievementIds } from "../../../lib/achievements";
import { SettingsContent } from "../../../components/SettingsContent";
import { ParentAccessCard, type ParentLink } from "../../../components/ParentAccessCard";

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
  let unlockedIds: string[] = [];
  let parentLinks: ParentLink[] = [];

  if (user) {
    const supabase = await createClient();

    const [usage, profileRow, canvasConnection, parentLinksRow] = await Promise.all([
      getAiUsageSnapshot(supabase, user.id),
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
    ]);

    isPro = usage.isPro;
    used = usage.used;
    limit = usage.limit;

    const unlocked = getUnlockedAchievementIds({
      longestStreak: profileRow.data?.longest_streak ?? 0,
      hasGeneratedStudyPlan: Boolean(profileRow.data?.first_study_plan_at),
      canvasConnected: Boolean(canvasConnection),
    });
    unlockedIds = Array.from(unlocked);
    parentLinks = parentLinksRow.data ?? [];
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
          xFunction · Settings
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
          justUpgraded={upgraded === "1"}
          unlockedAchievementIds={unlockedIds}
        />

        <ParentAccessCard initialLinks={parentLinks} userEmail={user?.email ?? null} />
      </div>
    </div>
  );
}
