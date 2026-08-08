// A prediction only becomes checkable once the course has genuinely
// moved on from where it was when the prediction was logged — i.e.
// more of the course's points have since been graded. Below that
// threshold, "reality" hasn't caught up to the prediction yet, so
// scoring it would just be comparing a number against itself.
const MIN_PERCENT_GRADED_INCREASE = 5;

export interface PredictionRecord {
  predicted_grade: number;
  percent_graded_at_prediction: number;
  created_at: string;
}

export interface PredictionAccuracy {
  hasBaseline: boolean;
  comparable: boolean;
  predictedGrade: number | null;
  actualGrade: number | null;
  percentGradedAtPrediction: number | null;
  percentGradedNow: number;
  createdAt: string | null;
  diff: number | null;
}

// Pure so it can be reused both for a single course (the Grades page)
// and aggregated across every course the student has (Settings).
export function evaluatePrediction(
  baseline: PredictionRecord | null,
  liveGrade: number,
  livePercentGraded: number
): PredictionAccuracy {
  if (!baseline) {
    return {
      hasBaseline: false,
      comparable: false,
      predictedGrade: null,
      actualGrade: null,
      percentGradedAtPrediction: null,
      percentGradedNow: livePercentGraded,
      createdAt: null,
      diff: null,
    };
  }

  const comparable =
    livePercentGraded - baseline.percent_graded_at_prediction >= MIN_PERCENT_GRADED_INCREASE;

  return {
    hasBaseline: true,
    comparable,
    predictedGrade: baseline.predicted_grade,
    actualGrade: comparable ? liveGrade : null,
    percentGradedAtPrediction: baseline.percent_graded_at_prediction,
    percentGradedNow: livePercentGraded,
    createdAt: baseline.created_at,
    diff: comparable ? Math.round(Math.abs(liveGrade - baseline.predicted_grade) * 10) / 10 : null,
  };
}

export function accuracyLabel(diff: number): string {
  if (diff <= 2) return "Spot on";
  if (diff <= 5) return "Close";
  if (diff <= 10) return "Off a bit";
  return "Way off";
}
