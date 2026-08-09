import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleOAuthTokenResponse, GoogleIdTokenClaims } from "./google-classroom-types";

// Real per-user persistence, backed by the google_classroom_connections
// table (see supabase/migrations/0019_platform_connections.sql). Same
// pattern as lib/canvas-token-store.ts — every row is scoped to a real
// user id and protected by Row Level Security.

export async function saveGoogleClassroomToken(
  supabase: SupabaseClient,
  userId: string,
  token: GoogleOAuthTokenResponse,
  claims: GoogleIdTokenClaims
) {
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;

  const { error } = await supabase.from("google_classroom_connections").upsert({
    user_id: userId,
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? null,
    token_type: token.token_type,
    expires_at: expiresAt,
    scope: token.scope,
    google_user_id: claims.sub,
    google_user_name: claims.name ?? "Google Classroom user",
    google_user_email: claims.email ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getGoogleClassroomConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<{ google_user_id: string; google_user_name: string } | null> {
  const { data, error } = await supabase
    .from("google_classroom_connections")
    .select("google_user_id, google_user_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function clearGoogleClassroomToken(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from("google_classroom_connections")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}
