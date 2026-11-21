// The access rules for the parent feature that live in TypeScript. No imports,
// so they can be unit tested (tests/parent-hardening.test.cjs). The rules that
// MUST be atomic (claiming a code, the guess limit) live in the database
// functions (supabase/pending/0029_parent_hardening.sql) and are tested
// against a real Postgres in tests/parent-hardening-db.test.cjs.

// ------------------------------------------------------------ claim results

export type ClaimResult = "ok" | "invalid" | "throttled" | "own_invite";

export interface Outcome {
  status: number;
  code: "ok" | "invalid" | "throttled" | "own_invite" | "unavailable";
  message: string;
}

// What the server tells the browser for each answer from the database. Every
// way a code can be wrong (never existed, expired, already used, revoked) gets
// the SAME answer, so nobody can tell which it was.
export function describeClaimResult(result: unknown): Outcome {
  switch (result) {
    case "ok":
      return { status: 200, code: "ok", message: "You're linked." };
    case "invalid":
      return { status: 404, code: "invalid", message: "This invite link is invalid, expired or has already been used." };
    case "throttled":
      return { status: 429, code: "throttled", message: "Too many wrong codes. Please wait an hour and try again." };
    case "own_invite":
      return { status: 400, code: "own_invite", message: "You can't link your own account as a parent." };
    default:
      // Anything unexpected is a refusal, never a pass (fail closed).
      return { status: 503, code: "unavailable", message: "Linking isn't available right now. Please try again later." };
  }
}

// ------------------------------------------------------------ who may see whom

export interface LinkRow {
  id?: string;
  student_id: string;
  parent_id: string | null;
  status: string;
}

// The one question the parent page asks before reading anything about a
// student: among the links the parent's own session can see, is there an ACTIVE
// link from THIS parent to THIS student? (Revoked, pending, someone else's
// and other-student links all answer no.)
export function findActiveLink<T extends LinkRow>(
  links: readonly T[] | null | undefined,
  parentId: string,
  studentId: string
): T | null {
  if (!parentId || !studentId) return null;
  return (
    (links ?? []).find((l) => l.parent_id === parentId && l.student_id === studentId && l.status === "active") ?? null
  );
}

// ------------------------------------------------------------ what a parent gets

export interface ParentSummary {
  overallGrade: number;
  trend: "up" | "down" | "steady";
  history: { label: string; percentage: number }[];
  courses: { name: string; grade: number }[];
  upcoming: { title: string; course: string; dueDate: string }[];
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.slice(0, max) : "");

// A real calendar date written exactly as YYYY-MM-DD (the WHOLE value is checked,
// and 2026-02-30 is not a date), or "" if it isn't.
function isoDate(v: unknown): string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? v : "";
}

// The ONLY shape that ever leaves the server for a parent. It copies a fixed
// list of fields out of whatever it is given, so anything else (scores, notes,
// tasks, goals, study sessions, schedule, plans, chat, settings,
// notifications, ids) cannot slip through even if a caller passes it in.
export function toParentSafeSummary(raw: unknown): ParentSummary {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const trend = r.trend === "up" || r.trend === "down" ? r.trend : "steady";
  const list = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : [];

  return {
    overallGrade: num(r.overallGrade),
    trend,
    history: list(r.history).map((p) => ({ label: str(p.label, 40), percentage: num(p.percentage) })),
    courses: list(r.courses).map((c) => ({ name: str(c.name, 80), grade: num(c.grade) })),
    upcoming: list(r.upcoming).map((u) => ({
      title: str(u.title, 120),
      course: str(u.course, 80),
      dueDate: isoDate(u.dueDate),
    })),
  };
}
