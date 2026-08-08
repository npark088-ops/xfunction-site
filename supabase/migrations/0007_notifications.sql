-- XFunction: in-app notifications (achievement unlocks, urgent
-- deadlines, AI generation limit reached)
-- Run this once in the Supabase dashboard's SQL Editor, after 0006_achievements.sql.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null,
  message text not null,
  link text,
  -- Lets ensureNotification() (lib/notifications.ts) upsert-and-ignore
  -- instead of re-checking existence first — e.g. "achievement:week-streak"
  -- or "deadline:ap-biology:302" can only ever be inserted once per user.
  dedupe_key text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

alter table notifications enable row level security;

create policy "Users manage their own notifications"
  on notifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
