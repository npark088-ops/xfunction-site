// Unit tests for the parent feature's TypeScript pieces (lib/parent-invite.ts and
// lib/parent-access.ts): the code format, hashing, email masking, how each
// database answer is reported, who may see whom, and the "only this and
// nothing more" summary a parent receives. The database rules themselves (expiry,
// one-time use, the wrong-code limit, who can write link rows) are tested
// against a real Postgres in tests/parent-hardening-db.test.cjs.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const build = process.env.XF_TEST_BUILD;
if (!build) throw new Error("Run these tests with `npm test` (it compiles the TypeScript first).");
const invite = require(path.join(build, "parent-invite.js"));
const access = require(path.join(build, "parent-access.js"));

// ----------------------------------------------------------------------------
// invite codes
// ----------------------------------------------------------------------------

test("codes: 32 URL-safe characters carrying at least 128 bits (192 here)", () => {
  const code = invite.generateInviteCode();
  assert.equal(code.length, invite.INVITE_CODE_LENGTH);
  assert.match(code, /^[A-Za-z0-9_-]{32}$/);
  const bytes = Buffer.from(code, "base64url");
  assert.ok(bytes.length * 8 >= 128, `only ${bytes.length * 8} bits`);
  assert.equal(bytes.length, 24);
});

test("codes: they don't repeat", () => {
  const seen = new Set();
  for (let i = 0; i < 5000; i++) seen.add(invite.generateInviteCode());
  assert.equal(seen.size, 5000);
});

test("codes: every byte value turns up (it isn't a narrow alphabet)", () => {
  const counts = new Set();
  for (let i = 0; i < 400; i++) for (const b of Buffer.from(invite.generateInviteCode(), "base64url")) counts.add(b);
  assert.ok(counts.size > 240, `only ${counts.size} different byte values in 9,600 bytes`);
});

test("hash: SHA-256 as 64 lowercase hex characters, the same every time", () => {
  // The standard test value for SHA-256 of "abc".
  assert.equal(invite.hashInviteCode("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const code = invite.generateInviteCode();
  assert.equal(invite.hashInviteCode(code), invite.hashInviteCode(code));
  assert.match(invite.hashInviteCode(code), /^[0-9a-f]{64}$/);
  assert.notEqual(invite.hashInviteCode(code), invite.hashInviteCode(code + "x"));
  assert.ok(!invite.hashInviteCode(code).includes(code), "the hash doesn't contain the code");
});

test("code check: accepts a real code (even with spaces from copy and paste)", () => {
  const code = invite.generateInviteCode();
  assert.equal(invite.normalizeInviteCode(code), code);
  assert.equal(invite.normalizeInviteCode(`  ${code}\n`), code);
});

test("code check: everything else is refused before the database is asked", () => {
  const code = invite.generateInviteCode();
  for (const bad of [
    undefined,
    null,
    42,
    {},
    [],
    "",
    "ABC123", // too short
    "ABCDE12345", // the OLD 10-character format
    code.slice(1), // 31 characters
    code + "A", // 33 characters
    `${code.slice(0, 10)} ${code.slice(11)}`, // a space inside
    `${code.slice(0, 31)}!`,
    `${code.slice(0, 20)}'; drop table parent_links;--`.slice(0, 32),
    "../../etc/passwd/../../etc/passwd/aa",
    "%00".repeat(11),
    "A".repeat(10_000),
  ]) {
    assert.equal(invite.normalizeInviteCode(bad), null, JSON.stringify(bad)?.slice(0, 40));
  }
});

test("masking: first letter, three stars, then the domain", () => {
  assert.equal(invite.maskEmail("jane.doe@gmail.com"), "j***@gmail.com");
  assert.equal(invite.maskEmail("J@school.edu"), "J***@school.edu");
  assert.equal(invite.maskEmail("a.b+tag@sub.example.org"), "a***@sub.example.org");
});

test("masking: the rest of the name never survives", () => {
  const masked = invite.maskEmail("mysecretname@gmail.com");
  assert.ok(!masked.includes("ysecret"));
  assert.ok(!masked.includes("name@"));
});

test("masking: odd input never throws and never leaks", () => {
  for (const odd of [undefined, null, 5, {}, "", "no-at-sign", "@nolocal.com", "trailing@", "@"]) {
    assert.equal(invite.maskEmail(odd), "***", String(odd));
  }
  // two @ signs: the LAST one starts the domain
  assert.equal(invite.maskEmail("we@ird@host.com"), "w***@host.com");
});

test("the invite link carries the code, URL-encoded, on the given origin", () => {
  assert.equal(invite.inviteLink("https://app.example", "abc-DEF_123"), "https://app.example/parent/join?code=abc-DEF_123");
  assert.equal(invite.inviteLink("https://app.example", "a b&c"), "https://app.example/parent/join?code=a%20b%26c");
});

test("the allowance matches the requirement: 5 wrong codes per hour", () => {
  assert.equal(invite.INVITE_MAX_FAILURES, 5);
  assert.equal(invite.INVITE_FAILURE_WINDOW_MINUTES, 60);
  assert.equal(invite.INVITE_TTL_DAYS, 7);
});

// ----------------------------------------------------------------------------
// how each database answer is reported
// ----------------------------------------------------------------------------

test("answers: ok / invalid / throttled / own invite", () => {
  assert.equal(access.describeClaimResult("ok").status, 200);
  assert.equal(access.describeClaimResult("invalid").status, 404);
  assert.equal(access.describeClaimResult("throttled").status, 429);
  assert.equal(access.describeClaimResult("own_invite").status, 400);
});

test("answers: anything unexpected is a refusal, never a pass (fail closed)", () => {
  for (const odd of [undefined, null, "", "OK", "okay", "allowed", true, 1, {}, "ok "]) {
    const o = access.describeClaimResult(odd);
    assert.equal(o.code, "unavailable", String(odd));
    assert.equal(o.status, 503);
  }
});

test("answers: a wrong, expired, used or revoked code all look the same to the parent", () => {
  // The database reports all four as "invalid", and that one result has one message.
  const messages = new Set(["invalid", "invalid", "invalid", "invalid"].map((r) => access.describeClaimResult(r).message));
  assert.equal(messages.size, 1);
  assert.match(access.describeClaimResult("invalid").message, /invalid, expired or has already been used/);
});

// ----------------------------------------------------------------------------
// who may see whom
// ----------------------------------------------------------------------------

const P1 = "00000000-0000-0000-0000-0000000000a1";
const P2 = "00000000-0000-0000-0000-0000000000a2";
const S1 = "00000000-0000-0000-0000-0000000000b1";
const S2 = "00000000-0000-0000-0000-0000000000b2";
const link = (over = {}) => ({ id: "L", student_id: S1, parent_id: P1, status: "active", ...over });

test("access: an active link from this parent to this student passes", () => {
  assert.equal(access.findActiveLink([link()], P1, S1).id, "L");
});

test("access: a parent asking for ANOTHER student's id is refused", () => {
  assert.equal(access.findActiveLink([link()], P1, S2), null);
  // even when other people's links are in the list
  assert.equal(access.findActiveLink([link(), link({ student_id: S2, parent_id: P2, id: "M" })], P1, S2), null);
});

test("access: someone else's link doesn't count as mine", () => {
  assert.equal(access.findActiveLink([link({ parent_id: P2 })], P1, S1), null);
});

test("access: revoked and pending links give no access", () => {
  assert.equal(access.findActiveLink([link({ status: "revoked" })], P1, S1), null);
  assert.equal(access.findActiveLink([link({ status: "pending", parent_id: null })], P1, S1), null);
  assert.equal(access.findActiveLink([link({ status: "ACTIVE" })], P1, S1), null, "exact status only");
});

test("access: empty, missing or blank inputs give no access", () => {
  assert.equal(access.findActiveLink([], P1, S1), null);
  assert.equal(access.findActiveLink(null, P1, S1), null);
  assert.equal(access.findActiveLink(undefined, P1, S1), null);
  assert.equal(access.findActiveLink([link()], "", S1), null);
  assert.equal(access.findActiveLink([link()], P1, ""), null);
  assert.equal(access.findActiveLink([link({ parent_id: null })], "", S1), null, "a pending row never matches a blank parent");
});

// ----------------------------------------------------------------------------
// what a parent receives
// ----------------------------------------------------------------------------

const RICH = {
  overallGrade: 87.456,
  trend: "up",
  history: [{ label: "Wk 1", percentage: 80, scoreDetail: "x", assignmentId: 9 }],
  courses: [{ name: "AP Biology", grade: 91.2, id: "course-1", creditHours: 1.5, notes: "my private notes", score: 42 }],
  upcoming: [
    {
      title: "Lab report",
      course: "AP Biology",
      dueDate: "2026-11-21",
      points: 50,
      score: 0,
      assignmentId: 12,
      studentNotes: "private",
    },
  ],
  // things that must never reach a parent, even if a caller passes them in:
  notes: ["secret note"],
  tasks: [{ text: "secret task" }],
  goals: [{ target: 95 }],
  studySessions: [{ minutes: 90 }],
  schedule: [{ day: 1 }],
  studyPlans: [{ plan: "secret plan" }],
  chat: [{ role: "user", content: "secret chat" }],
  settings: { theme: "dark" },
  notifications: [{ message: "secret notification" }],
  scores: [{ assignment: "Secret test", score: 42 }],
  student_email: "student@private.test",
  user_id: "11111111-2222-3333-4444-555555555555",
  is_pro: true,
};

test("summary: only the allowed fields come out", () => {
  const out = access.toParentSafeSummary(RICH);
  assert.deepEqual(Object.keys(out).sort(), ["courses", "history", "overallGrade", "trend", "upcoming"]);
  assert.deepEqual(Object.keys(out.courses[0]).sort(), ["grade", "name"]);
  assert.deepEqual(Object.keys(out.upcoming[0]).sort(), ["course", "dueDate", "title"]);
  assert.deepEqual(Object.keys(out.history[0]).sort(), ["label", "percentage"]);
});

test("summary: none of the private data survives anywhere in the output", () => {
  const text = JSON.stringify(access.toParentSafeSummary(RICH));
  for (const secret of [
    "secret note",
    "secret task",
    "secret plan",
    "secret chat",
    "secret notification",
    "Secret test",
    "my private notes",
    "private@",
    "student@private.test",
    "11111111-2222",
    "course-1",
    "creditHours",
    "is_pro",
    "studySessions",
    "schedule",
    "score",
  ]) {
    assert.ok(!text.includes(secret), `leaked: ${secret}`);
  }
});

test("summary: the allowed values are kept as they are", () => {
  const out = access.toParentSafeSummary(RICH);
  assert.equal(out.overallGrade, 87.456);
  assert.equal(out.trend, "up");
  assert.deepEqual(out.courses, [{ name: "AP Biology", grade: 91.2 }]);
  assert.deepEqual(out.upcoming, [{ title: "Lab report", course: "AP Biology", dueDate: "2026-11-21" }]);
});

test("summary: junk in gives a safe, empty summary out (never throws)", () => {
  for (const junk of [null, undefined, 5, "text", [], { courses: "no", upcoming: 7, history: {} }]) {
    const out = access.toParentSafeSummary(junk);
    assert.equal(out.overallGrade, 0);
    assert.equal(out.trend, "steady");
    assert.deepEqual(out.courses, []);
    assert.deepEqual(out.upcoming, []);
    assert.deepEqual(out.history, []);
  }
});

test("summary: bad values are cleaned (numbers, trend, dates, lengths)", () => {
  const out = access.toParentSafeSummary({
    overallGrade: NaN,
    trend: "sideways",
    courses: [{ name: "N".repeat(1000), grade: Infinity }, null, 7],
    upcoming: [
      { title: "T".repeat(1000), course: 5, dueDate: "next friday" },
      { title: "ok", course: "c", dueDate: "2026-02-30x" },
      { title: "impossible", course: "c", dueDate: "2026-02-30" },
      { title: "fine", course: "c", dueDate: "2028-02-29" },
    ],
    history: [{ label: "L".repeat(500), percentage: "90" }],
  });
  assert.equal(out.overallGrade, 0);
  assert.equal(out.trend, "steady");
  assert.equal(out.courses.length, 1);
  assert.equal(out.courses[0].name.length, 80);
  assert.equal(out.courses[0].grade, 0);
  assert.equal(out.upcoming[0].title.length, 120);
  assert.equal(out.upcoming[0].course, "");
  assert.equal(out.upcoming[0].dueDate, "");
  assert.equal(out.upcoming[1].dueDate, "");
  assert.equal(out.upcoming[2].dueDate, "", "2026-02-30 is not a real date");
  assert.equal(out.upcoming[3].dueDate, "2028-02-29", "a real leap day is kept");
  assert.equal(out.history[0].label.length, 40);
  assert.equal(out.history[0].percentage, 0, "a numeric string isn't a number");
});

test("summary: __proto__ tricks in the input don't change what comes out", () => {
  const evil = JSON.parse('{"overallGrade":50,"__proto__":{"isAdmin":true},"courses":[{"name":"X","grade":1,"__proto__":{"isAdmin":true}}]}');
  const out = access.toParentSafeSummary(evil);
  assert.equal(out.isAdmin, undefined);
  assert.equal(out.courses[0].isAdmin, undefined);
  assert.equal({}.isAdmin, undefined);
});
