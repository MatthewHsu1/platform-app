export type FrequencyWrites = {
  updates: { id: string; wonCount: number; lostCount: number }[];
  creates: { teamId: string | null; variable: string; value: string; wonCount: number; lostCount: number }[];
};
