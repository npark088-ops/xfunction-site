import { createClient } from "../../../lib/supabase/server";

// Called once per /app visit. Bumps the streak the first time a user
// shows up on a given calendar day, resets it if a day was missed, and
// is a no-op on repeat visits within the same day (so refreshing /app
// doesn't re-trigger the increment or the celebration animation).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("profiles")
    .select("current_streak, longest_streak, last_active_date")
    .eq("user_id", user.id)
    .maybeSingle();

  const previousStreak = existing?.current_streak ?? 0;
  const previousLongest = existing?.longest_streak ?? 0;
  const lastActiveDate = existing?.last_active_date ?? null;

  if (lastActiveDate === today) {
    return Response.json({ streak: previousStreak, longest: previousLongest, increased: false });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const nextStreak = lastActiveDate === yesterdayStr ? previousStreak + 1 : 1;
  const nextLongest = Math.max(previousLongest, nextStreak);

  await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      current_streak: nextStreak,
      longest_streak: nextLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return Response.json({
    streak: nextStreak,
    longest: nextLongest,
    increased: nextStreak > previousStreak,
  });
}
