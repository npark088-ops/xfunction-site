-- xFunction: per-user profile data (billing + streak)
-- Run this once in the Supabase dashboard's SQL Editor (Project → SQL Editor → New query),
-- same as 0001_init.sql.

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- Billing (Stripe). is_pro is the single source of truth the app reads
  -- to unlock unlimited AI generations — flipped by the Stripe webhook
  -- once that's wired up, not set directly by the client.
  is_pro boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,

  -- Free-tier AI generation usage, reset monthly. Shared across study
  -- plans, study guides, and coach check-ins — see lib/ai-usage.ts.
  ai_generations_used int not null default 0,
  usage_period_start date not null default date_trunc('month', now())::date,

  -- Daily streak (see lib/streak.ts / app/api/streak).
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,

  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users manage their own profile"
  on profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
