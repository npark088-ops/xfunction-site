-- XFunction: separate free-tier quota for the Support chat assistant,
-- tracked independently from both the shared study plan/guide/quiz/
-- coach-insight quota (ai_generations_used) and Your Consultant's chat
-- quota (chat_messages_used, see 0016_chat_usage.sql) — Support is a
-- different feature for a different purpose (account/app help, not
-- academic help), so it shouldn't eat into or be eaten by either.
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.

alter table profiles
  add column if not exists support_messages_used int not null default 0,
  add column if not exists support_usage_period_start date not null default date_trunc('month', now())::date;
