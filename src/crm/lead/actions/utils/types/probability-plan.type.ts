export type ProbabilityPlan =
  | { kind: 'refuse'; reason: string }
  | {
      kind: 'update';
      appData: { automatedProbability: number } | null;
      userData: Record<string, string | number | null>;
    };
