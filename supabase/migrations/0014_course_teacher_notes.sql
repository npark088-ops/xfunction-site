-- XFunction: private per-student rating + note about a course/teacher
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.

create table if not exists course_teacher_notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null,
  rating smallint,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id),
  constraint course_teacher_notes_rating_range check (rating is null or (rating between 1 and 5))
);

alter table course_teacher_notes enable row level security;

create policy "Users manage their own teacher notes"
  on course_teacher_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
