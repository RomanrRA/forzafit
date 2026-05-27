export interface AdviceDraft {
  exerciseId: string;
  suggestedWeightKg: number | null;
  suggestedReps: number | null;
  suggestedSets: number | null;
  reason: string;
}

export interface ExerciseHistorySummary {
  exerciseId: string;
  exerciseName: string;
  lastSessionDate: string | null;
  lastSets: Array<{
    weightKg: number | null;
    reps: number | null;
    rpe: number | null;
  }>;
  avgRpe: number | null;
  prWeightKg: number | null;
}

export interface AdviceContext {
  userProfile: {
    gender: string | null;
    weightKg: number | null;
    goal: string | null;
  };
  exercises: ExerciseHistorySummary[];
}
