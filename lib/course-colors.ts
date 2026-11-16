// Single source of truth for "what color is this course" — every place
// a course shows up (Schedule calendar, Overview, Trends, course cards,
// the Grades page header, Compare, Search) reads from here instead of
// each computing its own index-into-a-palette, which used to drift out
// of sync whenever a component only had a subset or differently-ordered
// list of courses. Keying by courseId (not array position) is what
// makes it actually consistent across pages.

// blue/green/amber are reused from the semantic tokens (they already
// read as neutral "category" colors) — course-purple/teal/pink are
// dedicated categorical hues, see app/globals.css for why --red isn't
// included here.
const COURSE_COLOR_VARS = ["--blue", "--green", "--amber", "--course-purple", "--course-teal", "--course-pink"];

// Deterministic string hash → palette index, NOT an array-position
// lookup — this used to be `Object.keys(mockCourses).indexOf(courseId)`,
// which only worked because every course id was one of the 3 hardcoded
// demo ids known at import time. Real per-user course ids (see
// lib/user-courses.ts) are freshly generated UUIDs that were never in
// that list, so every real course collapsed to index -1 → the same
// single color. A hash needs no registry at all — any courseId, demo or
// real, maps to a stable index on its own.
function colorIndexFor(courseId: string): number {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = (hash * 31 + courseId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % COURSE_COLOR_VARS.length;
}

// The CSS custom property name (e.g. "--blue") — for contexts that need
// to resolve it to a literal color, like Chart.js canvas rendering (see
// lib/theme-color.ts's resolveCssVar).
export function courseColorVarName(courseId: string): string {
  return COURSE_COLOR_VARS[colorIndexFor(courseId)];
}

// The ready-to-use CSS value (e.g. "var(--blue)") — for inline styles.
export function courseColor(courseId: string): string {
  return `var(${courseColorVarName(courseId)})`;
}
