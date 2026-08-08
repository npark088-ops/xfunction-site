-- XFunction: separate free-tier quota for "Your Consultant" (the AI chat
-- advisor), tracked independently from the shared study plan/guide/quiz/
-- coach-insight quota (ai_generations_used, see 0002_profiles.sql).
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.

alter table profiles
  add column if not exists chat_messages_used int not null default 0,
  add column if not exists chat_usage_period_start date not null default date_trunc('month', now())::date;
