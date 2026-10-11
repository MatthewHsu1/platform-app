export type DailyJobStep = { order: number; name: string; run: () => Promise<void> };
