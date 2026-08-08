-- XFunction: per-user, per-course notes/journal
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.

create table if not exists course_notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table course_notes enable row level security;

create policy "Users manage their own course notes"
  on course_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
