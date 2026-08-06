// Lets a course use its own percentage → letter-grade mapping instead
// of one universal scale. Most courses use STANDARD_GRADING_SCALE, but
// a course can supply its own (e.g. a simplified scale with no +/-
// bands) via MockCourse.gradingScale.

export interface GradeBand {
  minPercent: number;
  letter: string;
}

export interface GradingScale {
  name: string;
  bands: GradeBand[]; // must be sorted descending by minPercent
}

export const STANDARD_GRADING_SCALE: GradingScale = {
  name: "Standard",
  bands: [
    { minPercent: 97, letter: "A+" },
    { minPercent: 93, letter: "A" },
    { minPercent: 90, letter: "A-" },
    { minPercent: 87, letter: "B+" },
    { minPercent: 83, letter: "B" },
    { minPercent: 80, letter: "B-" },
    { minPercent: 77, letter: "C+" },
    { minPercent: 73, letter: "C" },
    { minPercent: 70, letter: "C-" },
    { minPercent: 67, letter: "D+" },
    { minPercent: 63, letter: "D" },
    { minPercent: 60, letter: "D-" },
    { minPercent: 0, letter: "F" },
  ],
};

// A simplified scale some courses use — no +/- bands, just letter grades.
export const SIMPLE_GRADING_SCALE: GradingScale = {
  name: "Simple (no +/-)",
  bands: [
    { minPercent: 90, letter: "A" },
    { minPercent: 80, letter: "B" },
    { minPercent: 70, letter: "C" },
    { minPercent: 60, letter: "D" },
    { minPercent: 0, letter: "F" },
  ],
};

export function letterGradeFor(
  percentage: number,
  scale: GradingScale = STANDARD_GRADING_SCALE
): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const band = scale.bands.find((b) => clamped >= b.minPercent);
  return band?.letter ?? scale.bands[scale.bands.length - 1].letter;
}
