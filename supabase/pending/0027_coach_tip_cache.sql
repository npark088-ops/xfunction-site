-- XFunction: saved daily coach check-in (one per user per day)
-- NOT RUN YET. Paste into the Supabase dashboard's SQL Editor when ready.
--
-- Why: the Overview page used to ask the AI for a coach tip on EVERY visit,
-- spending one of a free student's 3 monthly generations each time. The app now
-- generates at most one tip per user per local day and reuses it (see
-- lib/coach-cache.ts and app/api/coach-overview/route.ts).
--
-- The app works without this table (it just can't share the saved tip between
-- devices, and each browser still keeps its own copy), so it is safe to deploy
-- the code first and run this afterwards.
--
-- Writes happen only from server code with the service-role key (which skips
-- row-level security). Signed-in users may only READ their own row.

create table if not exists coach_tips (
  user_id uuid not null references auth.users(id) on delete cascade,
  tip_date date not null,
  insight text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tip_date)
);

alter table coach_tips enable row level security;

create policy "Users read their own coach tips"
  on coach_tips
  for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies on purpose: users can't write this table.
revoke insert, update, delete on coach_tips from anon, authenticated;
