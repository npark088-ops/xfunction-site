import type { SupabaseClient } from "@supabase/supabase-js";
import { SchoologyOAuthTokenPair, SchoologyUser } from "./schoology-types";

// Real per-user persistence, backed by the schoology_connections table
// (see supabase/migrations/0019_platform_connections.sql). Same pattern
// as lib/canvas-token-store.ts, except there's no single bearer token to
// store — Schoology's OAuth1 needs both the access token AND its secret,
// since every future API call has to be re-signed with the pair (see
// lib/oauth1-signing.ts), not just presented in an Authorization: Bearer
// header.

export async function saveSchoologyToken(
  supabase: SupabaseClient,
  userId: string,
  token: SchoologyOAuthTokenPair,
  profile: SchoologyUser
) {
  const { error } = await supabase.from("schoology_connections").upsert({
    user_id: userId,
    access_token: token.oauth_token,
    access_token_secret: token.oauth_token_secret,
    schoology_user_id: String(profile.id),
    schoology_user_name: profile.name_display,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getSchoologyConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<{ schoology_user_id: string; schoology_user_name: string | null } | null> {
  const { data, error } = await supabase
    .from("schoology_connections")
    .select("schoology_user_id, schoology_user_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function clearSchoologyToken(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.from("schoology_connections").delete().eq("user_id", userId);
  if (error) throw error;
}
