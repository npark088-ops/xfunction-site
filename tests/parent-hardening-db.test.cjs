// Database-level tests for supabase/pending/0029_parent_hardening.sql.
//
// These run the project's REAL migration files (0012, 0013, 0022) and then the
// new 0029 file against an in-memory Postgres (PGlite), with Supabase's roles
// (anon / authenticated / service_role) and auth.uid() stood in, and check the
// behaviour that matters: expired and reused codes, the wrong-code limit, a
// student trying to write link rows directly, a parent trying to read another
// student's data, revoked links, and the locked-down privileges.
//
// PGlite is NOT a project dependency, so without it these tests SKIP (they say
// so). To run them:
//     npm install --no-save @electric-sql/pglite
//     npm test
// or point PGLITE_DIR at an installed copy of the package.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

function loadPglite() {
  const candidates = [process.env.PGLITE_DIR ? path.join(process.env.PGLITE_DIR, "dist", "index.cjs") : null, "@electric-sql/pglite"];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return require(c).PGlite;
    } catch {
      /* try the next one */
    }
  }
  return null;
}
const PGlite = loadPglite();
const SKIP = PGlite ? false : "PGlite isn't installed (npm install --no-save @electric-sql/pglite, or set PGLITE_DIR)";

const BASE_FILES = [
  "supabase/migrations/0012_parent_links.sql",
  "supabase/migrations/0013_fix_parent_links_default.sql",
  "supabase/migrations/0022_manual_courses.sql",
];
const HARDENING = "supabase/pending/0029_parent_hardening.sql";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const newCode = () => crypto.randomBytes(24).toString("base64url");

async function bootBase() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    -- Supabase hands these roles everything on new tables and functions by default;
    -- the migrations are expected to take it back where it shouldn't be given.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);
  for (const f of BASE_FILES) await db.exec(read(f));
  return db;
}

async function bootHardened() {
  const db = await bootBase();
  await db.exec(read(HARDENING));
  return db;
}

// Run `fn` as a Supabase role. `userId` becomes auth.uid().
function as(db, role, userId, fn) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    if (userId) await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    return fn(tx);
  });
}
const asService = (db, fn) => as(db, "service_role", null, fn);
const asUser = (db, userId, fn) => as(db, "authenticated", userId, fn);
const asAnon = (db, fn) => as(db, "anon", null, fn);

async function mkUser(db, email) {
  const r = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  return r.rows[0].id;
}

async function seedStudentData(db, studentId, tag) {
  const courseId = `course-${tag}`;
  await db.query("insert into courses (id, user_id, name) values ($1, $2, $3)", [courseId, studentId, `Secret class ${tag}`]);
  const g = await db.query(
    "insert into assignment_groups (course_id, user_id, name, weight) values ($1, $2, 'Tests', 100) returning id",
    [courseId, studentId]
  );
  await db.query(
    "insert into assignments (group_id, user_id, name, points_possible, score) values ($1, $2, 'Secret test', 100, 42)",
    [g.rows[0].id, studentId]
  );
}

const create = async (db, studentId, code) =>
  (await asService(db, (tx) => tx.query("select * from create_parent_invite($1, $2)", [studentId, sha256(code)]))).rows[0];
const claim = async (db, parentId, code) =>
  (await asService(db, (tx) => tx.query("select * from claim_parent_invite($1, $2, 5, 60)", [parentId, sha256(code)]))).rows[0];
const peek = async (db, parentId, code) =>
  (await asService(db, (tx) => tx.query("select * from peek_parent_invite_v2($1, $2, 5, 60)", [parentId, sha256(code)]))).rows[0];
const linkRow = async (db, id) => (await db.query("select * from parent_links where id = $1", [id])).rows[0];

const denied = (e) => /permission denied/i.test(e.message) || e.code === "42501";

// One shared hardened database for the tests that don't need a clean slate.
let shared;
test.before(async () => {
  if (!PGlite) return;
  shared = await bootHardened();
});

// ----------------------------------------------------------------------------
// invites
// ----------------------------------------------------------------------------

test("invite: only a hash is stored (never the code), with a 7 day expiry", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "inv1@student.test");
  const code = newCode();
  const row = await create(shared, student, code);
  const saved = await linkRow(shared, row.r_id);
  assert.equal(saved.status, "pending");
  assert.equal(saved.invite_code, null, "no plain-text code");
  assert.equal(saved.invite_code_hash, sha256(code));
  assert.ok(!JSON.stringify(saved).includes(code), "the code appears nowhere in the row");
  const days = (new Date(saved.expires_at) - Date.now()) / 86400000;
  assert.ok(days > 6.99 && days <= 7.001, `expires in ~7 days, got ${days}`);
});

test("invite: the function refuses anything that isn't a SHA-256 hash", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "inv2@student.test");
  for (const bad of ["ABC123", "", sha256("x").toUpperCase(), sha256("x") + "0", "not hex ".repeat(8)]) {
    await assert.rejects(() => asService(shared, (tx) => tx.query("select * from create_parent_invite($1, $2)", [student, bad])));
  }
});

test("invite: a student can have at most 5 pending invites; expired ones stop counting", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "inv3@student.test");
  for (let i = 0; i < 5; i++) await create(shared, student, newCode());
  await assert.rejects(() => create(shared, student, newCode()), /too_many_pending_invites/);
  await shared.query("update parent_links set expires_at = now() - interval '1 minute' where student_id = $1", [student]);
  const again = await create(shared, student, newCode());
  assert.ok(again.r_id, "an expired invite no longer counts toward the cap");
});

test("invite: an unknown student can't get an invite", { skip: SKIP }, async () => {
  await assert.rejects(() => create(shared, "00000000-0000-0000-0000-000000000000", newCode()));
});

// ----------------------------------------------------------------------------
// claiming
// ----------------------------------------------------------------------------

test("claim: works once; a reused code is refused (for anyone)", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "c1@student.test");
  const parent = await mkUser(shared, "c1@parent.test");
  const other = await mkUser(shared, "c1@other.test");
  const code = newCode();
  const inv = await create(shared, student, code);

  const first = await claim(shared, parent, code);
  assert.equal(first.r_result, "ok");
  assert.equal(first.r_student_id, student);

  const link = await linkRow(shared, inv.r_id);
  assert.equal(link.status, "active");
  assert.equal(link.parent_id, parent);
  assert.equal(link.invite_code_hash, null, "the hash is erased once used");

  assert.equal((await claim(shared, parent, code)).r_result, "invalid", "same parent again");
  assert.equal((await claim(shared, other, code)).r_result, "invalid", "a different person with the same code");
});

test("claim: an expired code is refused, with the same answer as a wrong one", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "c2@student.test");
  const parent = await mkUser(shared, "c2@parent.test");
  const code = newCode();
  const inv = await create(shared, student, code);
  await shared.query("update parent_links set expires_at = now() - interval '1 second' where id = $1", [inv.r_id]);
  const expired = await claim(shared, parent, code);
  const wrong = await claim(shared, parent, newCode());
  assert.equal(expired.r_result, "invalid");
  assert.deepEqual(expired, wrong, "expired and wrong are indistinguishable");
  assert.equal((await linkRow(shared, inv.r_id)).status, "pending", "an expired claim changes nothing");
});

test("claim: a revoked invite can't be claimed", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "c3@student.test");
  const parent = await mkUser(shared, "c3@parent.test");
  const code = newCode();
  const inv = await create(shared, student, code);
  const revoked = await asUser(shared, student, (tx) => tx.query("select revoke_parent_link($1) as ok", [inv.r_id]));
  assert.equal(revoked.rows[0].ok, true);
  assert.equal((await claim(shared, parent, code)).r_result, "invalid");
});

test("claim: a student can't claim their own invite (and it isn't counted as a wrong guess)", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "c4@student.test");
  const code = newCode();
  await create(shared, student, code);
  for (let i = 0; i < 7; i++) assert.equal((await claim(shared, student, code)).r_result, "own_invite");
  const failures = await shared.query("select count(*)::int as n from parent_invite_attempts where user_id = $1", [student]);
  assert.equal(failures.rows[0].n, 0);
});

test("throttle: 5 wrong codes, then everything is refused (even the right code) for an hour", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "t1@student.test");
  const parent = await mkUser(shared, "t1@parent.test");
  const bystander = await mkUser(shared, "t1@bystander.test");
  const code = newCode();
  const inv = await create(shared, student, code);

  for (let i = 0; i < 5; i++) assert.equal((await claim(shared, parent, newCode())).r_result, "invalid", `wrong guess ${i + 1}`);

  assert.equal((await claim(shared, parent, code)).r_result, "throttled", "the RIGHT code is refused too (fail closed)");
  assert.equal((await peek(shared, parent, code)).r_result, "throttled", "peeking is limited by the same allowance");
  assert.equal((await linkRow(shared, inv.r_id)).status, "pending", "nothing was claimed while throttled");

  // Someone else is not affected.
  assert.equal((await claim(shared, bystander, newCode())).r_result, "invalid");

  // After the hour the allowance comes back.
  await shared.query("update parent_invite_attempts set attempted_at = now() - interval '61 minutes' where user_id = $1", [parent]);
  assert.equal((await claim(shared, parent, code)).r_result, "ok");
});

test("throttle: the limit is exact even when guesses arrive at the same moment", { skip: SKIP }, async () => {
  const parent = await mkUser(shared, "t2@parent.test");
  const results = await Promise.all(
    Array.from({ length: 12 }, () => claim(shared, parent, newCode()).catch((e) => ({ r_result: "error:" + e.message })))
  );
  const counts = results.reduce((m, r) => ((m[r.r_result] = (m[r.r_result] || 0) + 1), m), {});
  assert.equal(counts.invalid, 5, JSON.stringify(counts));
  assert.equal(counts.throttled, 7, JSON.stringify(counts));
});

test("peek: shows the student's email for a good code, counts wrong ones, never changes the invite", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "p1@student.test");
  const parent = await mkUser(shared, "p1@parent.test");
  const code = newCode();
  const inv = await create(shared, student, code);
  const ok = await peek(shared, parent, code);
  assert.equal(ok.r_result, "ok");
  assert.equal(ok.r_student_email, "p1@student.test");
  assert.equal((await linkRow(shared, inv.r_id)).status, "pending");
  assert.equal((await peek(shared, parent, newCode())).r_result, "invalid");
  const n = await shared.query("select count(*)::int as n from parent_invite_attempts where user_id = $1", [parent]);
  assert.equal(n.rows[0].n, 1);
});

// ----------------------------------------------------------------------------
// students can't write link rows
// ----------------------------------------------------------------------------

test("a student can read their own links but cannot write them directly", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "w1@student.test");
  const parent = await mkUser(shared, "w1@parent.test");
  const code = newCode();
  const inv = await create(shared, student, code);

  const mine = await asUser(shared, student, (tx) => tx.query("select id, status from parent_links"));
  assert.ok(mine.rows.some((r) => r.id === inv.r_id), "reads their own link");

  // insert (also: inventing an already-active link for any parent)
  await assert.rejects(
    () => asUser(shared, student, (tx) => tx.query("insert into parent_links (student_id, student_email, parent_id, status, invite_code_hash, expires_at) values ($1,'x@y.z',$2,'active',null,null)", [student, parent])),
    denied
  );
  await assert.rejects(
    () => asUser(shared, student, (tx) => tx.query("insert into parent_links (student_id, student_email, invite_code_hash, expires_at) values ($1,'x@y.z',$2, now() + interval '1 year')", [student, sha256("mine")])),
    denied
  );
  // update (activating a link, changing the parent, extending the expiry, un-revoking)
  for (const sql of [
    "update parent_links set status = 'active', parent_id = $2 where id = $1",
    "update parent_links set expires_at = now() + interval '10 years' where id = $1",
    "update parent_links set status = 'pending' where id = $1",
    "update parent_links set invite_code_hash = null where id = $1",
  ]) {
    await assert.rejects(() => asUser(shared, student, (tx) => tx.query(sql, sql.includes("$2") ? [inv.r_id, parent] : [inv.r_id])), denied, sql);
  }
  // delete
  await assert.rejects(() => asUser(shared, student, (tx) => tx.query("delete from parent_links where id = $1", [inv.r_id])), denied);

  const after = await linkRow(shared, inv.r_id);
  assert.equal(after.status, "pending");
  assert.equal(after.invite_code_hash, sha256(code), "nothing changed");
});

test("signed-in users can't read the code hash or the plain-text column", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "w2@student.test");
  await create(shared, student, newCode());
  await assert.rejects(() => asUser(shared, student, (tx) => tx.query("select invite_code_hash from parent_links")), denied);
  await assert.rejects(() => asUser(shared, student, (tx) => tx.query("select invite_code from parent_links")), denied);
  await assert.rejects(() => asUser(shared, student, (tx) => tx.query("select * from parent_links")), denied, "select * includes hidden columns");
});

test("a student can't read another student's links", { skip: SKIP }, async () => {
  const a = await mkUser(shared, "w3a@student.test");
  const b = await mkUser(shared, "w3b@student.test");
  const inv = await create(shared, a, newCode());
  const seen = await asUser(shared, b, (tx) => tx.query("select id from parent_links where id = $1", [inv.r_id]));
  assert.equal(seen.rows.length, 0);
});

test("anonymous visitors can't touch parent links at all", { skip: SKIP }, async () => {
  await assert.rejects(() => asAnon(shared, (tx) => tx.query("select id from parent_links")), denied);
  await assert.rejects(() => asAnon(shared, (tx) => tx.query("insert into parent_links (student_id, student_email, invite_code_hash, expires_at) values (gen_random_uuid(),'a@b.c','x', now())")), denied);
  await assert.rejects(() => asAnon(shared, (tx) => tx.query("select revoke_parent_link(gen_random_uuid())")), denied);
});

// ----------------------------------------------------------------------------
// the functions: who may call them
// ----------------------------------------------------------------------------

test("only the server (service_role) can create, peek or claim; users and anon can't call them", { skip: SKIP }, async () => {
  const user = await mkUser(shared, "f1@user.test");
  const h = sha256("whatever");
  const calls = [
    ["select * from create_parent_invite($1, $2)", [user, h]],
    ["select * from peek_parent_invite_v2($1, $2, 5, 60)", [user, h]],
    ["select * from claim_parent_invite($1, $2, 5, 60)", [user, h]],
  ];
  for (const [sql, params] of calls) {
    await assert.rejects(() => asUser(shared, user, (tx) => tx.query(sql, params)), denied, `authenticated: ${sql}`);
    await assert.rejects(() => asAnon(shared, (tx) => tx.query(sql, params)), denied, `anon: ${sql}`);
  }
});

test("every function is SECURITY DEFINER with a fixed search_path, and the attempts table is closed", { skip: SKIP }, async () => {
  const fns = await shared.query(
    "select proname, prosecdef, proconfig from pg_proc where pronamespace = 'public'::regnamespace and proname in ('create_parent_invite','peek_parent_invite_v2','claim_parent_invite','revoke_parent_link','leave_parent_link')"
  );
  assert.equal(fns.rows.length, 5);
  for (const f of fns.rows) {
    assert.equal(f.prosecdef, true, `${f.proname} is SECURITY DEFINER`);
    assert.ok((f.proconfig || []).some((c) => c.startsWith("search_path=")), `${f.proname} has a fixed search_path`);
  }
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(() => as(shared, role, null, (tx) => tx.query("select * from parent_invite_attempts")), denied, role);
    await assert.rejects(() => as(shared, role, null, (tx) => tx.query("insert into parent_invite_attempts (user_id) values (gen_random_uuid())")), denied, role);
  }
  const old = await shared.query("select count(*)::int as n from pg_proc where proname in ('accept_parent_invite','peek_parent_invite')");
  assert.equal(old.rows[0].n, 0, "the old plain-text-code functions are gone");
});

// ----------------------------------------------------------------------------
// revoke and leave
// ----------------------------------------------------------------------------

async function activeLink(db, tag) {
  const student = await mkUser(db, `${tag}@student.test`);
  const parent = await mkUser(db, `${tag}@parent.test`);
  const code = newCode();
  const inv = await create(db, student, code);
  assert.equal((await claim(db, parent, code)).r_result, "ok");
  return { student, parent, linkId: inv.r_id };
}

test("revoke: the student ends access and the parent loses sight of the link at once", { skip: SKIP }, async () => {
  const { student, parent, linkId } = await activeLink(shared, "r1");
  const before = await asUser(shared, parent, (tx) => tx.query("select id from parent_links where id = $1", [linkId]));
  assert.equal(before.rows.length, 1, "an active link is visible to the parent");

  const res = await asUser(shared, student, (tx) => tx.query("select revoke_parent_link($1) as ok", [linkId]));
  assert.equal(res.rows[0].ok, true);

  const after = await asUser(shared, parent, (tx) => tx.query("select id from parent_links where id = $1", [linkId]));
  assert.equal(after.rows.length, 0, "a revoked link is invisible to the parent");
  const row = await linkRow(shared, linkId);
  assert.equal(row.status, "revoked");
  assert.equal(row.ended_by, "student");
  assert.ok(row.revoked_at);
});

test("revoke: only the student who owns the link can do it", { skip: SKIP }, async () => {
  const { student, parent, linkId } = await activeLink(shared, "r2");
  const stranger = await mkUser(shared, "r2@stranger.test");
  for (const who of [parent, stranger]) {
    const r = await asUser(shared, who, (tx) => tx.query("select revoke_parent_link($1) as ok", [linkId]));
    assert.equal(r.rows[0].ok, false);
  }
  assert.equal((await linkRow(shared, linkId)).status, "active");
  assert.equal((await asUser(shared, student, (tx) => tx.query("select revoke_parent_link($1) as ok", [linkId]))).rows[0].ok, true);
  assert.equal((await asUser(shared, student, (tx) => tx.query("select revoke_parent_link($1) as ok", [linkId]))).rows[0].ok, false, "already revoked");
});

test("revoke: a student can cancel a pending invite, and its code stops working", { skip: SKIP }, async () => {
  const student = await mkUser(shared, "r3@student.test");
  const parent = await mkUser(shared, "r3@parent.test");
  const code = newCode();
  const inv = await create(shared, student, code);
  await asUser(shared, student, (tx) => tx.query("select revoke_parent_link($1)", [inv.r_id]));
  assert.equal((await linkRow(shared, inv.r_id)).invite_code_hash, null);
  assert.equal((await claim(shared, parent, code)).r_result, "invalid");
});

test("leave: a parent ends their own link; nobody else can", { skip: SKIP }, async () => {
  const { student, parent, linkId } = await activeLink(shared, "l1");
  const stranger = await mkUser(shared, "l1@stranger.test");
  for (const who of [student, stranger]) {
    const r = await asUser(shared, who, (tx) => tx.query("select leave_parent_link($1) as ok", [linkId]));
    assert.equal(r.rows[0].ok, false, "only the parent of the link may leave it");
  }
  const res = await asUser(shared, parent, (tx) => tx.query("select leave_parent_link($1) as ok", [linkId]));
  assert.equal(res.rows[0].ok, true);
  const row = await linkRow(shared, linkId);
  assert.equal(row.status, "revoked");
  assert.equal(row.ended_by, "parent");
  const mine = await asUser(shared, student, (tx) => tx.query("select status, ended_by from parent_links where id = $1", [linkId]));
  assert.equal(mine.rows[0].ended_by, "parent", "the student can see that the parent left");
});

// ----------------------------------------------------------------------------
// what a parent can read
// ----------------------------------------------------------------------------

test("a linked parent can NOT read the student's courses, categories or assignments", { skip: SKIP }, async () => {
  const { student, parent } = await activeLink(shared, "a1");
  await seedStudentData(shared, student, "a1");
  for (const table of ["courses", "assignment_groups", "assignments"]) {
    const asParent = await asUser(shared, parent, (tx) => tx.query(`select * from ${table}`));
    assert.equal(asParent.rows.length, 0, `${table}: nothing visible to the parent`);
  }
  // The student still reads their own.
  const own = await asUser(shared, student, (tx) => tx.query("select score from assignments"));
  assert.ok(own.rows.length >= 1);
});

test("a parent can't see another student's links or data by asking for their id", { skip: SKIP }, async () => {
  const mine = await activeLink(shared, "a2mine");
  const theirs = await activeLink(shared, "a2theirs");
  await seedStudentData(shared, theirs.student, "a2theirs");

  const links = await asUser(shared, mine.parent, (tx) => tx.query("select student_id from parent_links where student_id = $1", [theirs.student]));
  assert.equal(links.rows.length, 0, "no link row for the other student is visible");
  const all = await asUser(shared, mine.parent, (tx) => tx.query("select student_id, parent_id, status from parent_links"));
  assert.deepEqual(all.rows.map((r) => r.student_id), [mine.student], "only their own link");
  assert.ok(all.rows.every((r) => r.parent_id === mine.parent && r.status === "active"));

  const data = await asUser(shared, mine.parent, (tx) => tx.query("select * from assignments where user_id = $1", [theirs.student]));
  assert.equal(data.rows.length, 0);
});

test("a revoked link no longer shows up for the parent", { skip: SKIP }, async () => {
  const { student, parent, linkId } = await activeLink(shared, "a3");
  await asUser(shared, student, (tx) => tx.query("select revoke_parent_link($1)", [linkId]));
  const rows = await asUser(shared, parent, (tx) => tx.query("select id from parent_links"));
  assert.equal(rows.rows.length, 0);
});

test("a student who also has parents linked sees only their own links as 'student', and as a parent only theirs", { skip: SKIP }, async () => {
  const { student: childOfX, parent: x } = await activeLink(shared, "a4x");
  // x is ALSO a student, with their own parent.
  const ownParent = await mkUser(shared, "a4x@ownparent.test");
  const code = newCode();
  await create(shared, x, code);
  assert.equal((await claim(shared, ownParent, code)).r_result, "ok");

  const asParent = await asUser(shared, x, (tx) => tx.query("select student_id from parent_links where parent_id = $1 and status = 'active'", [x]));
  assert.deepEqual(asParent.rows.map((r) => r.student_id), [childOfX], "filtering on parent_id lists only the children");
});

// ----------------------------------------------------------------------------
// existing data
// ----------------------------------------------------------------------------

test("migration: active links keep working, old pending invites are revoked, plain-text codes are erased, and it re-runs safely", { skip: SKIP }, async () => {
  const db = await bootBase();
  const s1 = await mkUser(db, "m1@student.test");
  const p1 = await mkUser(db, "m1@parent.test");
  const s2 = await mkUser(db, "m2@student.test");
  await db.query("insert into parent_links (student_id, student_email, parent_id, parent_email, invite_code, status, accepted_at) values ($1,'m1@student.test',$2,'m1@parent.test','OLDACTIVE1','active', now())", [s1, p1]);
  await db.query("insert into parent_links (student_id, student_email, invite_code, status) values ($1,'m2@student.test','OLDPEND123','pending')", [s2]);
  await seedStudentData(db, s1, "m1");

  await db.exec(read(HARDENING));

  const rows = (await db.query("select * from parent_links order by student_email")).rows;
  const active = rows.find((r) => r.student_email === "m1@student.test");
  const pending = rows.find((r) => r.student_email === "m2@student.test");
  assert.equal(active.status, "active");
  assert.equal(active.parent_id, p1, "the active link is untouched");
  assert.equal(pending.status, "revoked", "the old pending invite is revoked");
  assert.equal(pending.ended_by, "system");
  assert.ok(rows.every((r) => r.invite_code === null), "no plain-text code survives");

  // The still-active parent can still read their link (and nothing else).
  const seen = await as(db, "authenticated", p1, (tx) => tx.query("select id from parent_links"));
  assert.equal(seen.rows.length, 1);
  assert.equal((await as(db, "authenticated", p1, (tx) => tx.query("select * from courses"))).rows.length, 0);

  // The old plain-text codes are useless against the new functions.
  assert.equal((await db.query("select * from parent_links where invite_code_hash is not null")).rows.length, 0);

  // Running the file a second time is harmless.
  await db.exec(read(HARDENING));
  const again = (await db.query("select status from parent_links where student_email = 'm1@student.test'")).rows[0];
  assert.equal(again.status, "active");
});

// ----------------------------------------------------------------------------
// the file itself
// ----------------------------------------------------------------------------

test("the SQL file locks things down and ships with checks and a rollback", () => {
  const sql = read(HARDENING);
  assert.match(sql, /revoke all on table parent_links from public, anon, authenticated/);
  assert.match(sql, /revoke all on table parent_invite_attempts from public, anon, authenticated/);
  assert.match(sql, /alter table parent_invite_attempts enable row level security/);
  // Only the live part of the file (the checks and rollback below it are comments).
  const live = sql.split("-- AFTER RUNNING")[0];
  assert.equal((live.match(/create or replace function/g) || []).length, 5);
  assert.equal((live.match(/security definer/g) || []).length, 5, "every function is SECURITY DEFINER");
  assert.equal((live.match(/set search_path = public/g) || []).length, 5, "every function has a fixed search_path");
  for (const fn of ["create_parent_invite", "peek_parent_invite_v2", "claim_parent_invite", "revoke_parent_link", "leave_parent_link"]) {
    assert.match(sql, new RegExp(`revoke all on function ${fn}\\(.*\\) from public, anon, authenticated`), `${fn} revoke`);
    assert.match(sql, new RegExp(`grant execute on function ${fn}\\(`), `${fn} grant`);
  }
  assert.doesNotMatch(live, /grant execute on function (create|peek|claim)_parent_invite\w*\([^)]*\) to (anon|authenticated|public)/);
  assert.doesNotMatch(live, /grant (insert|update|delete|all)[^;]*on table parent_links to (anon|authenticated|public)/);
  assert.match(sql, /ROLLBACK/);
  assert.match(sql, /AFTER RUNNING/);
  assert.match(sql, /^begin;$/m);
  assert.match(sql, /^commit;$/m);
});
