// Single source of truth for "what color is this course" — every place
// a course shows up (Schedule calendar, Overview, Trends, course cards,
// the Grades page header, Compare, Search) reads from here instead of
// each computing its own index-into-a-palette, which used to drift out
// of sync whenever a component only had a subset or differently-ordered
// list of courses. Keying by courseId (not array position) is what
// makes it actually consistent across pages.
import { mockCourses } from "./mock-canvas-data";

// blue/green/amber are reused from the semantic tokens (they already
// read as neutral "category" colors) — course-purple/teal/pink are
// dedicated categorical hues, see app/globals.css for why --red isn't
// included here.
const COURSE_COLOR_VARS = ["--blue", "--green", "--amber", "--course-purple", "--course-teal", "--course-pink"];

const COURSE_ID_ORDER = Object.keys(mockCourses);

function colorIndexFor(courseId: string): number {
  const index = COURSE_ID_ORDER.indexOf(courseId);
  return index === -1 ? 0 : index % COURSE_COLOR_VARS.length;
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
