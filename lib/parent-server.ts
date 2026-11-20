import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { getUserCourses } from "./user-courses";
import { getCreditHours } from "./mock-canvas-data";
import { calculateCurrentGrade, calculateWeightedOverallGrade } from "./grade-calculator";
import { getOverallGradeHistory, trendDirection } from "./grade-history";
import { getUpcomingAssignments } from "./upcoming-assignments";
import { localDate } from "./local-date";
import {
  INVITE_FAILURE_WINDOW_MINUTES,
  INVITE_MAX_FAILURES,
  generateInviteCode,
  hashInviteCode,
  inviteLink,
  maskEmail,
  normalizeInviteCode,
} from "./parent-invite";
import { describeClaimResult, findActiveLink, toParentSafeSummary, type Outcome, type ParentSummary } from "./parent-access";

// Everything the parent feature needs the server for. The pattern is the same
// as lib/profile-server.ts: verify the user from the SESSION (never an id the
// caller hands in), then use the admin client only for the one narrow thing
// that user is allowed to do. The database functions these call
// (supabase/pending/0029_parent_hardening.sql) can be executed by the server
// only; the browser cannot call them.

async function sessionUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

type Row = Record<string, unknown>;
const firstRow = (data: unknown): Row | null => {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? (row as Row) : null;
};

const UNAVAILABLE: Outcome = describeClaimResult("unavailable");

// ------------------------------------------------------------ student: new invite

export type CreateInviteResult =
  | { ok: true; code: string; link: string; expiresAt: string }
  | { ok: false; status: number; message: string };

// The code is made HERE (192 bits), only its hash is stored, and the code is
// returned to the student once: it can't be looked up again.
export async function createParentInvite(supabase: SupabaseClient, origin: string): Promise<CreateInviteResult> {
  const user = await sessionUser(supabase);
  if (!user) return { ok: false, status: 401, message: "Not signed in" };

  const code = generateInviteCode();
  try {
    const { data, error } = await createAdminClient().rpc("create_parent_invite", {
      p_student_id: user.id,
      p_code_hash: hashInviteCode(code),
    });
    if (error) {
      if (error.message.includes("too_many_pending_invites")) {
        return { ok: false, status: 409, message: "You already have 5 invites waiting. Cancel one first." };
      }
      if (error.message.includes("too_many_active_links")) {
        return { ok: false, status: 409, message: "You've reached the limit of 10 linked parents." };
      }
      console.error("create_parent_invite failed:", error.code ?? "", error.message);
      return { ok: false, status: 503, message: "Couldn't create the invite. Please try again." };
    }
    const row = firstRow(data);
    if (!row || typeof row.r_expires_at !== "string") {
      return { ok: false, status: 503, message: "Couldn't create the invite. Please try again." };
    }
    return { ok: true, code, link: inviteLink(origin, code), expiresAt: row.r_expires_at };
  } catch (error) {
    console.error("create_parent_invite failed:", error instanceof Error ? error.message : "unknown");
    return { ok: false, status: 503, message: "Couldn't create the invite. Please try again." };
  }
}

// ------------------------------------------------------------ parent: peek and accept

export type InviteResult =
  | { ok: true; maskedEmail: string }
  | { ok: false; outcome: Outcome };

async function callInviteFunction(
  supabase: SupabaseClient,
  fn: "peek_parent_invite_v2" | "claim_parent_invite",
  rawCode: unknown
): Promise<InviteResult> {
  const user = await sessionUser(supabase);
  if (!user) return { ok: false, outcome: { status: 401, code: "unavailable", message: "Please sign in first." } };

  // A malformed code is refused here without asking the database (and without
  // using up one of the parent's wrong-code allowance).
  const code = normalizeInviteCode(rawCode);
  if (!code) return { ok: false, outcome: describeClaimResult("invalid") };

  try {
    const { data, error } = await createAdminClient().rpc(fn, {
      p_parent_id: user.id,
      p_code_hash: hashInviteCode(code),
      p_max_failures: INVITE_MAX_FAILURES,
      p_window_minutes: INVITE_FAILURE_WINDOW_MINUTES,
    });
    if (error) {
      console.error(`${fn} failed:`, error.code ?? "", error.message);
      return { ok: false, outcome: UNAVAILABLE }; // fail closed
    }
    const row = firstRow(data);
    if (!row) return { ok: false, outcome: UNAVAILABLE };
    if (row.r_result !== "ok") return { ok: false, outcome: describeClaimResult(row.r_result) };
    return { ok: true, maskedEmail: maskEmail(row.r_student_email) };
  } catch (error) {
    console.error(`${fn} failed:`, error instanceof Error ? error.message : "unknown");
    return { ok: false, outcome: UNAVAILABLE };
  }
}

export const peekParentInvite = (supabase: SupabaseClient, code: unknown) =>
  callInviteFunction(supabase, "peek_parent_invite_v2", code);

export const acceptParentInvite = (supabase: SupabaseClient, code: unknown) =>
  callInviteFunction(supabase, "claim_parent_invite", code);

// ------------------------------------------------------------ parent: the summary

// What the /parent page shows for one student, and nothing more. Steps:
//  1. the parent's OWN session must see an ACTIVE link from them to this
//     student (the link table is readable by its two members only, and a
//     parent sees only active ones), otherwise null;
//  2. only then is the student's data read, with the admin client, because
//     parents have no database access to courses, categories or assignments;
//  3. the result is squeezed through toParentSafeSummary: overall grade and
//     trend, per-class grade, and upcoming work (title, class, due date). No
//     scores, notes, tasks, goals, study sessions, schedule, plans, chat,
//     settings or notifications.
export async function getParentSummary(
  supabase: SupabaseClient,
  studentId: string,
  timeZone: string
): Promise<ParentSummary | null> {
  const user = await sessionUser(supabase);
  if (!user) return null;

  const { data: links, error } = await supabase
    .from("parent_links")
    .select("id, student_id, parent_id, status")
    .eq("parent_id", user.id)
    .eq("student_id", studentId)
    .eq("status", "active");
  if (error) {
    console.error("Parent link check failed:", error.message);
    return null;
  }
  if (!findActiveLink(links, user.id, studentId)) return null;

  const courseMap = await getUserCourses(createAdminClient(), studentId);

  const courses = Object.values(courseMap).map((c) => ({
    id: c.id,
    name: c.name,
    grade: calculateCurrentGrade(c.assignmentGroups),
    creditHours: getCreditHours(c),
  }));
  const overallGrade = calculateWeightedOverallGrade(courses);
  const history = getOverallGradeHistory(overallGrade, Object.keys(courseMap));

  return toParentSafeSummary({
    overallGrade,
    trend: trendDirection(history),
    history,
    courses: courses.map((c) => ({ name: c.name, grade: c.grade })),
    upcoming: getUpcomingAssignments(courseMap, 7, timeZone).map((a) => ({
      title: a.assignmentName,
      course: a.courseName,
      dueDate: localDate(timeZone, a.dueAt),
    })),
  });
}
