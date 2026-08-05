import type { SupabaseClient } from "@supabase/supabase-js";
import { CanvasOAuthTokenResponse } from "./canvas-types";

// Real per-user persistence, backed by the canvas_connections table
// (see supabase/migrations/0001_init.sql). This used to be an
// in-memory mock keyed by nothing in particular; now every row is
// scoped to a real user id and protected by Row Level Security, so one
// user's Canvas token is never visible to another user or to an
// unauthenticated request.

export async function saveCanvasToken(
  supabase: SupabaseClient,
  userId: string,
  token: CanvasOAuthTokenResponse
) {
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;

  const { error } = await supabase.from("canvas_connections").upsert({
    user_id: userId,
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? null,
    token_type: token.token_type,
    expires_at: expiresAt,
    canvas_user_id: token.user.id,
    canvas_user_name: token.user.name,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getCanvasConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<{ canvas_user_id: number; canvas_user_name: string } | null> {
  const { data, error } = await supabase
    .from("canvas_connections")
    .select("canvas_user_id, canvas_user_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function clearCanvasToken(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.from("canvas_connections").delete().eq("user_id", userId);
  if (error) throw error;
}
