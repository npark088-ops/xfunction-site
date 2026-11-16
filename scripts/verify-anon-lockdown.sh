#!/usr/bin/env bash
# Re-tests the lockdown from outside, using ONLY the public anon key.
# Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from
# .env.local; never prints either value, and never uses the service-role
# key. Every call is harmless even if it unexpectedly succeeds:
#   - random UUIDs fail the auth.users foreign key
#   - delete_own_account deletes where id = auth.uid(), which is null for anon
#   - get_onboarding_email_candidates is asked for accounts "100000000 hours
#     old", so it returns nothing even if it were still open
#   - response bodies are discarded
#
# Run AFTER supabase/pending/paste-into-sql-editor.sql:
#   bash scripts/verify-anon-lockdown.sh
# Exit code 0 = every function behaves as expected.
set -u
cd "$(dirname "$0")/.."

URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '\r"')
KEY=$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | head -1 | cut -d= -f2- | tr -d '\r"')
if [ -z "$URL" ] || [ -z "$KEY" ]; then echo "Missing Supabase URL/anon key in .env.local"; exit 2; fi

UUID=$(node -e "console.log(crypto.randomUUID())")
fail=0

# call <function> <json body> <expected http status>
call() {
  local fn="$1" body="$2" want="$3" got
  got=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -X POST \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" -d "$body" "$URL/rest/v1/rpc/$fn")
  if [ "$got" = "$want" ]; then echo "PASS  $fn -> $got"; else echo "FAIL  $fn -> $got (expected $want)"; fail=1; fi
}

# 401 = "permission denied for function" — the anon role may not execute it.
call set_pro_on_checkout             "{\"p_user_id\":\"$UUID\",\"p_customer_id\":\"cus_probe\",\"p_subscription_id\":null}" 401
call set_pro_on_cancellation         '{"p_customer_id":"cus_probe"}' 401
call get_onboarding_email_candidates '{"p_email_key":"zz_probe","p_min_age_hours":100000000}' 401
call mark_onboarding_email_sent      "{\"p_user_id\":\"$UUID\",\"p_email_key\":\"zz_probe\"}" 401
call delete_own_account              '{}' 401
call accept_parent_invite            '{"p_invite_code":"zzprobe"}' 401
call peek_parent_invite              '{"p_invite_code":"zzprobe"}' 401

[ "$fail" = 0 ] && echo "All functions are locked down for anon." || echo "Some functions are STILL reachable by anon — see FAIL lines."
exit "$fail"
