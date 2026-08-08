-- XFunction: achievement tracking
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.
--
-- Records when a user first generated an AI study plan — used to
-- unlock the "First study plan generated" achievement (see
-- lib/achievements.ts). Other achievements are derived live from
-- data that's already persisted (streaks) or shared (grades), so this
-- is the only new column needed.

alter table profiles add column if not exists first_study_plan_at timestamptz;
