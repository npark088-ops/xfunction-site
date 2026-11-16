-- XFunction: READ-ONLY checks to run AFTER paste-into-sql-editor.sql.
-- Nothing here changes data or permissions. Run each query separately in
-- the Supabase SQL Editor and compare with the expected result.


-- 1) Which public functions can the anon role still execute?
--    EXPECTED: exactly ONE row — handle_new_user() (returns trigger; it is a
--    trigger function and cannot be called through the REST API).
--    Any other row is a function anonymous callers can still reach.
select p.oid::regprocedure              as function_signature,
       pg_get_function_result(p.oid)    as returns,
       p.prosecdef                      as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and has_function_privilege('anon', p.oid, 'execute')
order by 1;


-- 2) The full permission matrix for the functions this work locked down.
--    EXPECTED:
--      set_pro_on_checkout              anon=false  authenticated=false  service_role=true
--      set_pro_on_cancellation          anon=false  authenticated=false  service_role=true
--      get_onboarding_email_candidates  anon=false  authenticated=false  service_role=true
--      mark_onboarding_email_sent       anon=false  authenticated=false  service_role=true
--      delete_own_account               anon=false  authenticated=true
--      accept_parent_invite             anon=false  authenticated=true
--      peek_parent_invite               anon=false  authenticated=true
--    (service_role is not asserted for the last three.)
select p.oid::regprocedure                                       as fn,
       has_function_privilege('anon', p.oid, 'execute')          as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       has_function_privilege('service_role', p.oid, 'execute')  as service_role
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_pro_on_checkout', 'set_pro_on_cancellation',
                    'get_onboarding_email_candidates', 'mark_onboarding_email_sent',
                    'delete_own_account', 'accept_parent_invite', 'peek_parent_invite')
order by 1;


-- 3) Is the signup trigger installed, and does it save the signup fields?
--    EXPECTED: trigger_exists = true, saves_signup_fields = true.
select exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') as trigger_exists,
       position('platform_preference' in
                pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0 as saves_signup_fields;


-- 4) Did 0017 / 0018 land?
--    EXPECTED: all four true.
select to_regclass('public.study_sessions') is not null     as study_sessions_table,
       to_regclass('public.onboarding_emails') is not null  as onboarding_emails_table,
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'profiles'
                 and column_name = 'created_at')            as profiles_created_at,
       exists (select 1 from pg_policies
               where tablename = 'study_sessions')          as study_sessions_policy;


-- 5) Pro accounts without matching Stripe ids (COUNTS ONLY — no personal data).
--    Compare pro_total with the number of active subscriptions in Stripe.
--    Any non-zero "missing" / "malformed" / "sharing" count deserves a look.
with pro as (select * from profiles where is_pro)
select
  (select count(*) from pro)                                                   as pro_total,
  (select count(*) from pro where stripe_customer_id is null)                  as missing_customer_id,
  (select count(*) from pro where stripe_subscription_id is null)              as missing_subscription_id,
  (select count(*) from pro where stripe_customer_id is not null
                              and stripe_customer_id !~ '^cus_[A-Za-z0-9]+$')       as malformed_customer_id,
  (select count(*) from pro where stripe_subscription_id is not null
                              and stripe_subscription_id !~ '^sub_[A-Za-z0-9]+$')   as malformed_subscription_id,
  (select coalesce(sum(c - 1), 0) from (
      select count(*) c from pro where stripe_customer_id is not null
      group by stripe_customer_id having count(*) > 1) d)                      as extra_profiles_sharing_a_customer_id;
