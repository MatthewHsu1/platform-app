// Twenty's message for a unique index clash.
export const DUPLICATE_ENTRY_MESSAGE = 'A duplicate entry was detected';

export const CONFLICT_MESSAGES = [
  DUPLICATE_ENTRY_MESSAGE,
  'Record not found',
  // Postgres picks one of two runs writing the same rows to fail.
  'deadlock detected',
];
const ATTEMPTS = 5;
const WAIT_STEP_MS = 1_000;

// Two trigger runs for the same product can overlap (staff add values fast).
// The unique indexes (or a deadlock) stop the second run; it waits a
// little longer each time, reads the rows again and finishes from there.
export const retryOnConflict = async <TResult>(
  run: () => Promise<TResult>,
  { attempts = ATTEMPTS, waitStepMs = WAIT_STEP_MS } = {},
) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt >= attempts || !CONFLICT_MESSAGES.some((text) => message.includes(text))) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * waitStepMs));
    }
  }
};

export type ErrorCollector = ReturnType<typeof errorCollector>;

// Runs every piece of work even when one fails, then reports all failures at
// once, so one bad product in a batch does not leave the others undone.
export const errorCollector = () => {
  const failures: string[] = [];
  let count = 0;

  return {
    run: async (label: string, work: () => Promise<unknown>) => {
      count += 1;
      try {
        await work();
      } catch (error) {
        failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    throwIfAny: () => {
      if (failures.length > 0) {
        throw new Error(`${failures.length} of ${count} failed. ${failures.join(' | ')}`);
      }
    },
  };
};

export const forEachReportingErrors = async <TItem>(
  items: TItem[],
  run: (item: TItem) => Promise<unknown>,
) => {
  const errors = errorCollector();

  for (const item of items) {
    await errors.run(String(item), () => run(item));
  }
  errors.throwIfAny();
};
