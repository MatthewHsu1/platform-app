export type DailyJobStep = { order: number; name: string; run: (job: { startedAt: number }) => Promise<void> };
