-- XFunction: make a course's identity PER-USER, so "Load demo data" works
-- for every user (not just the first).
--
-- THE BUG (supabase/migrations/0022_manual_courses.sql):
--   courses.id is app-supplied text and the table's ONLY primary key, so a
--   given id can exist for one user in the whole database. "Load demo data"
--   inserts the literal ids 'ap-biology', 'us-history' and 'algebra-2' (they
--   are deliberate: lib/grade-history.ts and lib/mock-announcements.ts key
--   their canned content by those ids), so the SECOND user to click it gets
--   a duplicate-key error.
--
-- THE FIX: primary key (user_id, id), and assignment_groups points at
--   (user_id, course_id). Every other course-keyed table (course_notes,
--   course_goals, study_plans, course_schedule_blocks, course_teacher_notes,
--   grade_predictions, study_sessions) already uses (user_id, course_id);
--   courses was the odd one out.
--
-- EXISTING DATA: nothing is rewritten, moved or deleted. Courses already
-- seeded as 'ap-biology' etc. keep their ids, so their groups, assignments,
-- notes, goals, sessions, URLs and demo flavour content all keep working.
-- A bonus: the composite foreign key also stops one user attaching groups to
-- ANOTHER user's course (the old global key allowed that).
--
-- SAFE TO APPLY: before or after deploying the matching code (the code works
-- with either shape). Run it ONCE in the Supabase SQL Editor. It runs in a
-- single transaction: if anything below fails, nothing changes.
--
-- NOT re-runnable as-is after it succeeds (the old constraint names are gone
-- by then), but a second run only errors out harmlessly at the first guard.

-- ------------------------------------------------------------
-- STEP 0 (read-only, optional but recommended): run these two queries by
-- themselves first. Both should return NO ROWS.
--
--   -- a) groups whose owner differs from their course's owner (would block
--   --    the new foreign key):
--   select g.id as group_id, g.course_id, g.user_id as group_owner, c.user_id as course_owner
--   from assignment_groups g
--   join courses c on c.id = g.course_id
--   where g.user_id <> c.user_id;
--
--   -- b) any OTHER table with a foreign key to courses (this migration only
--   --    knows about assignment_groups):
--   select conrelid::regclass as table_with_fk, conname
--   from pg_constraint
--   where contype = 'f' and confrelid = 'public.courses'::regclass
--     and conrelid <> 'public.assignment_groups'::regclass;
-- ------------------------------------------------------------

begin;

do $$
declare
  v_fk text;
  v_pk text;
  v_mismatch int;
  v_other int;
begin
  -- Guard 1: no group may belong to a different user than its course.
  select count(*) into v_mismatch
  from assignment_groups g
  join courses c on c.id = g.course_id
  where g.user_id <> c.user_id;
  if v_mismatch > 0 then
    raise exception 'Aborting: % assignment_groups row(s) belong to a different user than their course. Run the STEP 0 query (a) at the top of this file to list them, fix or delete them, then re-run.', v_mismatch;
  end if;

  -- Guard 2: assignment_groups must be the only table with a foreign key to courses.
  select count(*) into v_other
  from pg_constraint
  where contype = 'f'
    and confrelid = 'public.courses'::regclass
    and conrelid <> 'public.assignment_groups'::regclass;
  if v_other > 0 then
    raise exception 'Aborting: another table has a foreign key to courses (see STEP 0 query (b)). It would also need to move to (user_id, course_id).';
  end if;

  -- Find the existing constraint names instead of assuming the defaults.
  select conname into v_fk
  from pg_constraint
  where contype = 'f'
    and conrelid = 'public.assignment_groups'::regclass
    and confrelid = 'public.courses'::regclass;
  select conname into v_pk
  from pg_constraint
  where contype = 'p' and conrelid = 'public.courses'::regclass;

  if v_fk is null or v_pk is null then
    raise exception 'Aborting: expected the original courses primary key and assignment_groups -> courses foreign key from 0022, but did not find them (pk=%, fk=%). Has this migration already run?', v_pk, v_fk;
  end if;

  -- 1) Drop the old single-column foreign key, then the old primary key.
  execute format('alter table assignment_groups drop constraint %I', v_fk);
  execute format('alter table courses drop constraint %I', v_pk);
end $$;

-- 2) A course is now identified by (owner, id).
alter table courses add constraint courses_pkey primary key (user_id, id);

-- 3) Groups point at the owner's course. (user_id is already NOT NULL on both.)
alter table assignment_groups
  add constraint assignment_groups_course_fk
  foreign key (user_id, course_id) references courses (user_id, id) on delete cascade;

-- 4) Index for the new foreign key (cascade deletes + per-course lookups).
create index if not exists assignment_groups_user_course_idx
  on assignment_groups (user_id, course_id);

commit;

-- ------------------------------------------------------------
-- AFTER RUNNING — read-only checks:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid in ('public.courses'::regclass, 'public.assignment_groups'::regclass)
--     and contype in ('p','f') order by 1;
--   -- expect: courses_pkey = PRIMARY KEY (user_id, id)
--   --         assignment_groups_course_fk = FOREIGN KEY (user_id, course_id)
--   --                                       REFERENCES courses(user_id, id) ON DELETE CASCADE
--
-- ROLLBACK (only possible while no two users share a course id; otherwise the
-- primary key below fails and you must delete or rename the duplicates first):
--   begin;
--   alter table assignment_groups drop constraint assignment_groups_course_fk;
--   alter table courses drop constraint courses_pkey;
--   alter table courses add constraint courses_pkey primary key (id);
--   alter table assignment_groups add constraint assignment_groups_course_id_fkey
--     foreign key (course_id) references courses (id) on delete cascade;
--   commit;
-- ------------------------------------------------------------
