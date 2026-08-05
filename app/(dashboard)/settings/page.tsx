import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { getAiUsageSnapshot } from "../../../lib/ai-usage";
import { SettingsContent } from "../../../components/SettingsContent";

const textDim = "#8B94AC";

// Server component — email and plan/usage status are known before the
// page ever reaches the browser (getAiUsageSnapshot is called directly
// here instead of the page fetching its own /api/profile route), so
// there's no loading flash for either. Only the toggles/checkout button
// need interactivity, which is what SettingsContent (client) handles.
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

  if (user) {
    const supabase = await createClient();
    const usage = await getAiUsageSnapshot(supabase, user.id);
    isPro = usage.isPro;
    used = usage.used;
    limit = usage.limit;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "white",
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
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
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
        />
      </div>
    </div>
  );
}
