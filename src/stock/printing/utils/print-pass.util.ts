export const PRINT_PASS_MINUTES = 10;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const DAYS_CLEARED = 7;
const PASS_PATTERN = /^[0-9a-f]{64}$/;

export const printPassExpiry = (now: Date) => new Date(now.getTime() + PRINT_PASS_MINUTES * MINUTE_MS).toISOString();

export const isPrintPassLive = (pass: { expiresAt: string }, now: Date) => now.getTime() < Date.parse(pass.expiresAt);

// A pass is 32 random bytes in hex; anything else is refused before the store is asked.
export const isPrintPassToken = (text: string) => PASS_PATTERN.test(text);

export const printPassKey = (pass: string) => `print-pass:${pass}`;

// The key-value store cannot list its keys, so each pass is also filed under its UTC day for the daily clean-up.
export const printPassDayKey = (day: Date) => `print-pass-day:${day.toISOString().slice(0, 10)}`;

export const stalePrintPassDayKeys = (now: Date) =>
  Array.from({ length: DAYS_CLEARED }, (_, index) => printPassDayKey(new Date(now.getTime() - (index + 1) * DAY_MS)));
