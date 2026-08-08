-- XFunction: per-user, per-course grade goals
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.

create table if not exists course_goals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null,
  target_grade numeric not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table course_goals enable row level security;

create policy "Users manage their own course goals"
  on course_goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
