import type { SupabaseClient } from "@supabase/supabase-js";
import { MoodleTokenResponse, MoodleSiteInfo } from "./moodle-types";

// Real per-user persistence, backed by the moodle_connections table
// (see supabase/migrations/0020_more_platform_connections.sql). Same
// pattern as lib/canvas-token-store.ts, plus a site_url column since
// Moodle has no fixed host — every user's connection can point at a
// different school's Moodle instance.

export async function saveMoodleToken(
  supabase: SupabaseClient,
  userId: string,
  siteUrl: string,
  token: MoodleTokenResponse,
  siteInfo: MoodleSiteInfo
) {
  const { error } = await supabase.from("moodle_connections").upsert({
    user_id: userId,
    site_url: siteUrl,
    token: token.token,
    private_token: token.privatetoken ?? null,
    moodle_user_id: String(siteInfo.userid),
    moodle_user_name: siteInfo.fullname,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getMoodleConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<{ moodle_user_id: string; moodle_user_name: string } | null> {
  const { data, error } = await supabase
    .from("moodle_connections")
    .select("moodle_user_id, moodle_user_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function clearMoodleToken(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.from("moodle_connections").delete().eq("user_id", userId);
  if (error) throw error;
}
