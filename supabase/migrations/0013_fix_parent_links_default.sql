-- XFunction: fix missing default on parent_links.student_id
-- Run this once in the Supabase dashboard's SQL Editor, after 0012_parent_links.sql.
--
-- Every other per-user table in this app (tasks, course_notes,
-- course_goals, study_plans, course_schedule_blocks, ...) defaults its
-- owning-user column to auth.uid(), so a plain insert from the client
-- never needs to pass it explicitly. parent_links.student_id was
-- missed in 0012 — inserts from Settings' "Invite a parent" button
-- fail with a not-null violation since no default fills it in.

alter table parent_links alter column student_id set default auth.uid();
