-- XFunction: self-service account deletion
-- Run this once in the Supabase dashboard's SQL Editor, after 0007_notifications.sql.
--
-- Deleting a row from auth.users isn't something a normal authenticated
-- client can do (the auth schema isn't exposed via RLS-governed
-- policies the way app tables are). Rather than hand the app a
-- service-role key just for this one action, this SECURITY DEFINER
-- function runs with the privileges of whichever role created it
-- (postgres, which owns the auth schema in Supabase) — same pattern as
-- set_pro_on_checkout/set_pro_on_cancellation in
-- 0003_stripe_webhook.sql. Every app table's user_id column already
-- references auth.users(id) on delete cascade, so this one delete
-- removes the profile, tasks, canvas connection, assignment
-- completions, course notes, and notifications along with it.
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_own_account() to authenticated;
