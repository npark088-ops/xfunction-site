-- xFunction: student-entered weekly class schedule
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.
--
-- Canvas (real or mocked) has no concept of class meeting times — it's
-- an LMS, not a bell schedule — so this is entirely student-entered
-- data, one row per weekly meeting block. day_of_week is 1 (Monday)
-- through 5 (Friday); a course meeting multiple days gets multiple rows.

create table if not exists course_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null,
  day_of_week smallint not null check (day_of_week between 1 and 5),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint course_schedule_blocks_time_order check (end_time > start_time)
);

alter table course_schedule_blocks enable row level security;

create policy "Users manage their own schedule blocks"
  on course_schedule_blocks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
