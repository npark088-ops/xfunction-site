import type { SupabaseClient } from "@supabase/supabase-js";
import { BlackboardOAuthTokenResponse, BlackboardUser } from "./blackboard-types";

// Real per-user persistence, backed by the blackboard_connections table
// (see supabase/migrations/0020_more_platform_connections.sql). Same
// pattern as lib/canvas-token-store.ts.

export async function saveBlackboardToken(
  supabase: SupabaseClient,
  userId: string,
  token: BlackboardOAuthTokenResponse,
  profile: BlackboardUser
) {
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;

  const { error } = await supabase.from("blackboard_connections").upsert({
    user_id: userId,
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? null,
    token_type: token.token_type,
    expires_at: expiresAt,
    blackboard_user_id: profile.id,
    blackboard_user_name: `${profile.name.given} ${profile.name.family}`.trim(),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getBlackboardConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<{ blackboard_user_id: string; blackboard_user_name: string } | null> {
  const { data, error } = await supabase
    .from("blackboard_connections")
    .select("blackboard_user_id, blackboard_user_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function clearBlackboardToken(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.from("blackboard_connections").delete().eq("user_id", userId);
  if (error) throw error;
}
