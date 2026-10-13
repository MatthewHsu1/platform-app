// The summed counts of one variable in one team (null: rows of no team).
export type ScoringTotal = { variable: string; teamId: string | null; wonCount: number; lostCount: number };
