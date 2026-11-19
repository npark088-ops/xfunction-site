// Quick Start: turn pasted text into courses + assignments the student can
// review. This file is the SAFETY NET between the AI and the database, and it
// has no imports on purpose so it is easy to test (see tests/quick-start.test.cjs).
//
// The AI's answer is untrusted input, exactly like the pasted text. Nothing it
// says is used as-is: only the fields listed below are read, every value is
// cleaned and range-checked, caps are enforced, and anything unusable is
// dropped (and the student is told). The AI never writes to the database; the
// student reviews and edits the result, and /api/quick-start/confirm runs the
// same checks again (strictly) before anything is saved.

export const QS_LIMITS = {
  maxChars: 15000, // pasted text
  maxCourses: 8,
  maxCategoriesPerCourse: 12,
  maxAssignments: 60, // across the whole import
  maxCourseName: 80,
  maxCategoryName: 60,
  maxTitle: 120,
  maxPoints: 10000,
  defaultPoints: 100,
  // Due dates outside this window (relative to the student's today) are
  // treated as mistakes.
  pastDaysAllowed: 366,
  futureDaysAllowed: 730,
  // A student can't pile up an unbounded number of courses through repeated imports.
  maxCoursesPerAccount: 40,
} as const;

export interface QsCategory {
  name: string;
  weight: number;
}
export interface QsAssignment {
  title: string;
  dueDate: string | null; // "YYYY-MM-DD", the student's calendar date
  category: string; // the name of one of the course's categories
  points: number;
}
export interface QsCourse {
  name: string;
  categories: QsCategory[];
  assignments: QsAssignment[];
}
export interface QsWarning {
  code:
    | "weights-not-100"
    | "bad-date"
    | "too-many-courses"
    | "too-many-categories"
    | "too-many-assignments"
    | "default-points"
    | "bad-weight"
    | "unknown-category"
    | "duplicate"
    | "dropped"
    | "no-categories";
  message: string;
  course?: string;
}
export interface QsPreview {
  courses: QsCourse[];
  warnings: QsWarning[];
}

export type QsResult = { ok: true; preview: QsPreview } | { ok: false; message: string };

// ---------------------------------------------------------------- input text

export function checkPastedText(
  value: unknown
): { ok: true; text: string } | { ok: false; message: string } {
  if (typeof value !== "string") return { ok: false, message: "Paste some text first." };
  if (value.length > QS_LIMITS.maxChars * 2) {
    // Don't even scan something enormous.
    return { ok: false, message: `That's too long. Please keep it under ${QS_LIMITS.maxChars.toLocaleString("en-US")} characters.` };
  }
  const text = sanitizeStudentText(value).trim();
  if (text.length < 10) return { ok: false, message: "Paste a syllabus, a list of classes, or what's due." };
  if (text.length > QS_LIMITS.maxChars) {
    return { ok: false, message: `That's too long. Please keep it under ${QS_LIMITS.maxChars.toLocaleString("en-US")} characters.` };
  }
  return { ok: true, text };
}

// Control characters out (keeps new lines and tabs), and the delimiter the
// prompt wraps the text in is defanged so pasted text can't "close" it and
// start speaking as the instructions.
export function sanitizeStudentText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/<\s*\/?\s*student_text/gi, "[student_text");
}

// ---------------------------------------------------------------- model reply

// The model is asked for bare JSON, but may wrap it in a code fence or add a
// sentence. Takes the outermost {...}; null if there is none or it isn't JSON.
export function parseModelJson(raw: unknown): unknown | null {
  if (typeof raw !== "string") return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- small helpers

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Plain text only: no control characters, no angle brackets (nothing here is
// ever rendered as HTML, but there is no reason to keep markup), one-line,
// single spaces, and a length cap.
export function cleanName(value: unknown, max: number): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/[\u0000-\u0008\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[\t\n\r\u000b\u000c\u2028\u2029]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

// Accepts 20, "20", "20%", "20.5". Everything else is NaN.
export function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string" && /^\s*-?\d+(\.\d+)?\s*%?\s*$/.test(value)) {
    return Number(value.replace("%", "").trim());
  }
  return NaN;
}

export function isRealDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function totalWeight(course: { categories: { weight: number }[] }): number {
  return round1(course.categories.reduce((sum, c) => sum + (Number.isFinite(c.weight) ? c.weight : 0), 0));
}

export function weightsAddUp(course: { categories: { weight: number }[] }): boolean {
  return Math.abs(totalWeight(course) - 100) <= 0.5;
}

// Scales a course's weights proportionally so they add up to exactly 100
// (the "make these add up" button). Equal split if they are all zero.
export function balanceWeights<T extends { categories: { weight: number }[] }>(course: T): T {
  const cats = course.categories;
  if (cats.length === 0) return course;
  const total = cats.reduce((s, c) => s + (Number.isFinite(c.weight) && c.weight > 0 ? c.weight : 0), 0);
  let weights = cats.map((c) =>
    total > 0 ? round1((Math.max(0, Number.isFinite(c.weight) ? c.weight : 0) / total) * 100) : round1(100 / cats.length)
  );
  const drift = round1(100 - weights.reduce((s, w) => s + w, 0));
  if (drift !== 0) {
    let big = 0;
    weights.forEach((w, i) => {
      if (w > weights[big]) big = i;
    });
    weights = weights.map((w, i) => (i === big ? round1(w + drift) : w));
  }
  return { ...course, categories: cats.map((c, i) => ({ ...c, weight: weights[i] })) };
}

// ---------------------------------------------------------------- the validator

interface Options {
  // The student's calendar date today, "YYYY-MM-DD" (see lib/local-date.ts).
  today: string;
  // "lenient": the AI's raw answer. Unusable pieces are dropped, clamped or
  //            defaulted, over-long lists are cut to the caps, and each fix is
  //            reported as a warning.
  // "strict":  what the student confirmed. Anything wrong is refused with a
  //            message instead of being quietly fixed.
  mode: "lenient" | "strict";
}

export function normalizeQuickStart(input: unknown, options: Options): QsResult {
  const strict = options.mode === "strict";
  const warnings: QsWarning[] = [];
  const warn = (code: QsWarning["code"], message: string, course?: string) =>
    warnings.push({ code, message, ...(course ? { course } : {}) });
  const fail = (message: string): QsResult => ({ ok: false, message });

  if (!isRecord(input) || !Array.isArray(input.courses)) {
    return fail("That didn't look like a list of classes.");
  }
  if (!isRealDate(options.today)) return fail("Couldn't work out today's date.");
  const today = dayNumber(options.today);

  let rawCourses = input.courses as unknown[];
  if (rawCourses.length > QS_LIMITS.maxCourses) {
    if (strict) return fail(`Please keep it to ${QS_LIMITS.maxCourses} classes at a time.`);
    warn("too-many-courses", `Only the first ${QS_LIMITS.maxCourses} classes were kept.`);
    rawCourses = rawCourses.slice(0, QS_LIMITS.maxCourses);
  }

  const courses: QsCourse[] = [];
  let assignmentBudget = QS_LIMITS.maxAssignments;
  let assignmentsTotal = 0;
  let truncatedAssignments = false;

  for (const rawCourse of rawCourses) {
    if (!isRecord(rawCourse)) {
      if (strict) return fail("One of the classes isn't readable.");
      warn("dropped", "A class that couldn't be read was skipped.");
      continue;
    }
    const courseName = cleanName(rawCourse.name, QS_LIMITS.maxCourseName);
    if (!courseName) {
      if (strict) return fail("Every class needs a name.");
      warn("dropped", "A class without a name was skipped.");
      continue;
    }

    // ---- categories
    let rawCategories = Array.isArray(rawCourse.categories) ? (rawCourse.categories as unknown[]) : [];
    if (rawCategories.length > QS_LIMITS.maxCategoriesPerCourse) {
      if (strict) return fail(`"${courseName}" has too many grade categories (the limit is ${QS_LIMITS.maxCategoriesPerCourse}).`);
      warn("too-many-categories", `Only the first ${QS_LIMITS.maxCategoriesPerCourse} grade categories of "${courseName}" were kept.`, courseName);
      rawCategories = rawCategories.slice(0, QS_LIMITS.maxCategoriesPerCourse);
    }

    const categories: QsCategory[] = [];
    const seen = new Set<string>();
    for (const rawCategory of rawCategories) {
      const name = isRecord(rawCategory) ? cleanName(rawCategory.name, QS_LIMITS.maxCategoryName) : "";
      if (!name) {
        if (strict) return fail(`Every grade category in "${courseName}" needs a name.`);
        warn("dropped", `A grade category without a name in "${courseName}" was skipped.`, courseName);
        continue;
      }
      if (seen.has(name.toLowerCase())) {
        if (strict) return fail(`"${courseName}" has two categories called "${name}". Rename one.`);
        warn("duplicate", `"${name}" appeared twice in "${courseName}"; kept the first.`, courseName);
        continue;
      }
      seen.add(name.toLowerCase());

      let weight = toNumber((rawCategory as Record<string, unknown>).weight);
      if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
        if (strict) return fail(`The weight for "${name}" in "${courseName}" must be a number from 0 to 100.`);
        warn("bad-weight", `The weight for "${name}" in "${courseName}" wasn't usable; please check it.`, courseName);
        weight = Number.isFinite(weight) ? Math.min(100, Math.max(0, weight)) : 0;
      }
      categories.push({ name, weight: round1(weight) });
    }

    // ---- assignments
    const rawAssignments = Array.isArray(rawCourse.assignments) ? (rawCourse.assignments as unknown[]) : [];
    // No categories at all but there are assignments: one catch-all category,
    // and anything that doesn't match goes in it (instead of an "Other" at weight 0).
    let catchAll: QsCategory | null = null;
    if (!strict && categories.length === 0 && rawAssignments.length > 0) {
      catchAll = { name: "Assignments", weight: 100 };
      categories.push(catchAll);
      warn("no-categories", `No grade categories were found for "${courseName}", so everything is under "Assignments" (100%).`, courseName);
    }
    const assignments: QsAssignment[] = [];
    const seenAssignments = new Set<string>();
    let defaultedPoints = 0;
    let extraCategory = false;

    for (const rawAssignment of rawAssignments) {
      if (assignmentBudget <= 0) {
        if (strict) return fail(`Please keep it to ${QS_LIMITS.maxAssignments} assignments at a time.`);
        truncatedAssignments = true;
        break;
      }
      if (!isRecord(rawAssignment)) {
        if (strict) return fail(`One of the assignments in "${courseName}" isn't readable.`);
        warn("dropped", `An assignment that couldn't be read in "${courseName}" was skipped.`, courseName);
        continue;
      }
      const title = cleanName(rawAssignment.title ?? rawAssignment.name, QS_LIMITS.maxTitle);
      if (!title) {
        if (strict) return fail(`Every assignment in "${courseName}" needs a title.`);
        warn("dropped", `An assignment without a title in "${courseName}" was skipped.`, courseName);
        continue;
      }

      // due date: a real calendar date inside the allowed window, or none
      let dueDate: string | null = null;
      const rawDate = rawAssignment.dueDate ?? rawAssignment.due_date ?? rawAssignment.due;
      if (rawDate !== null && rawDate !== undefined && rawDate !== "") {
        const n = isRealDate(rawDate) ? dayNumber(rawDate) : NaN;
        if (Number.isFinite(n) && n >= today - QS_LIMITS.pastDaysAllowed && n <= today + QS_LIMITS.futureDaysAllowed) {
          dueDate = rawDate as string;
        } else if (strict) {
          return fail(`The due date for "${title}" isn't a valid date.`);
        } else {
          warn("bad-date", `"${title}" had a due date that couldn't be used, so it has no due date. Please set one.`, courseName);
        }
      }

      // points
      let points = toNumber(rawAssignment.points ?? rawAssignment.pointsPossible ?? rawAssignment.points_possible);
      if (!Number.isFinite(points) || points <= 0 || points > QS_LIMITS.maxPoints) {
        if (strict) return fail(`The points for "${title}" must be a number above 0 (up to ${QS_LIMITS.maxPoints.toLocaleString("en-US")}).`);
        points = QS_LIMITS.defaultPoints;
        defaultedPoints++;
      }
      points = round1(points);

      // category: must be one of this course's categories
      let categoryName = cleanName(rawAssignment.category, QS_LIMITS.maxCategoryName);
      let match = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
      if (!match) {
        if (strict) return fail(`"${title}" is in a category ("${categoryName || "none"}") that "${courseName}" doesn't have.`);
        // Not one of the listed categories: park it in "Other" (weight 0, so it
        // can't skew the grade until the student gives it a weight).
        match = catchAll ?? categories.find((c) => c.name.toLowerCase() === "other");
        if (!match) {
          if (categories.length >= QS_LIMITS.maxCategoriesPerCourse) {
            match = categories[categories.length - 1];
          } else {
            match = { name: "Other", weight: 0 };
            categories.push(match);
            extraCategory = true;
          }
        }
        categoryName = match.name;
      } else {
        categoryName = match.name;
      }

      const key = `${title.toLowerCase()}|${dueDate ?? ""}|${categoryName.toLowerCase()}`;
      if (!strict && seenAssignments.has(key)) {
        warn("duplicate", `"${title}" appeared twice in "${courseName}"; kept one.`, courseName);
        continue;
      }
      seenAssignments.add(key);

      assignments.push({ title, dueDate, category: categoryName, points });
      assignmentBudget--;
      assignmentsTotal++;
    }

    if (defaultedPoints > 0) {
      warn("default-points", `${defaultedPoints} assignment${defaultedPoints === 1 ? "" : "s"} in "${courseName}" had no point value, so ${defaultedPoints === 1 ? "it was" : "they were"} set to ${QS_LIMITS.defaultPoints}. Please check.`, courseName);
    }
    if (extraCategory && !catchAll) {
      warn("unknown-category", `Some assignments in "${courseName}" didn't match a grade category, so they were put under "Other" (weight 0).`, courseName);
    }

    // (Strict mode: assignments need a category to live in.)
    if (strict && categories.length === 0 && assignments.length > 0) {
      return fail(`"${courseName}" needs at least one grade category for its assignments.`);
    }

    const course: QsCourse = { name: courseName, categories, assignments };
    if (categories.length > 0 && !weightsAddUp(course)) {
      warn("weights-not-100", `The grade weights for "${courseName}" add up to ${totalWeight(course)}%, not 100%.`, courseName);
    }
    courses.push(course);
  }

  if (truncatedAssignments) {
    warn("too-many-assignments", `Only the first ${QS_LIMITS.maxAssignments} assignments were kept.`);
  }
  if (strict && assignmentsTotal > QS_LIMITS.maxAssignments) {
    return fail(`Please keep it to ${QS_LIMITS.maxAssignments} assignments at a time.`);
  }
  if (courses.length === 0) {
    return fail(strict ? "There's nothing to save." : "I couldn't find any classes in that text.");
  }
  return { ok: true, preview: { courses, warnings } };
}
