// Turns the options a Print pop-up sent into the options a printable reads, or null to refuse them.
export type PrintOptionsParser = (options: Record<string, unknown>) => Record<string, unknown> | null;
