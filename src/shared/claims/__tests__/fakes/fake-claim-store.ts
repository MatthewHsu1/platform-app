import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';
import { type ClaimStore } from 'src/shared/claims/types/claim-store.type';

// Rows by key, as the unique index keeps them; the clock moves by hand.
export const makeFakeClaimStore = (start = '2026-10-08T10:00:00.000Z') => {
  const rows = new Map<string, ClaimRow>();
  const clock = { now: new Date(start) };
  let runCounter = 0;

  const store: ClaimStore = {
    create: async ({ key, runId, startedAt, progress }) => {
      if (rows.has(key)) {
        return 'exists';
      }
      rows.set(key, { id: `claim-${key}`, key, runId, startedAt, finishedAt: null, progress: structuredClone(progress) ?? null });
      return 'created';
    },
    createMany: async (newRows) => {
      if (newRows.some((row) => rows.has(row.key))) {
        return 'exists';
      }
      for (const row of newRows) {
        await store.create(row);
      }
      return 'created';
    },
    findByKey: async (key) => {
      const row = rows.get(key);
      return row === undefined ? null : structuredClone(row);
    },
    findByKeys: async (keys) => keys.flatMap((key) => (rows.has(key) ? [structuredClone(rows.get(key) as ClaimRow)] : [])),
    updateWhere: async ({ key, runId }, data) => {
      const row = rows.get(key);
      if (row === undefined || row.runId !== runId) {
        return false;
      }
      rows.set(key, { ...row, ...structuredClone(data) });
      return true;
    },
    destroy: async ({ key, runId }) => {
      const row = rows.get(key);
      if (row !== undefined && (runId === undefined || row.runId === runId)) {
        rows.delete(key);
      }
    },
    destroyMany: async ({ keys, runId }) => {
      for (const key of keys) {
        await store.destroy({ key, runId });
      }
    },
    findStale: async (startedBefore) =>
      [...rows.values()].filter((row) => row.finishedAt === null && row.startedAt < startedBefore),
    destroyFinished: async (finishedBefore) => {
      for (const row of [...rows.values()]) {
        if (row.finishedAt !== null && row.finishedAt < finishedBefore) {
          rows.delete(row.key);
        }
      }
    },
    now: () => new Date(clock.now),
    newRunId: () => {
      runCounter += 1;
      return `run-${runCounter}`;
    },
  };

  const advanceMinutes = (minutes: number) => {
    clock.now = new Date(clock.now.getTime() + minutes * 60_000);
  };

  return { store, rows, advanceMinutes };
};

// Holds each findByKey until the test releases it, so two runs can be made to
// read the same row before either writes. The row is read when released.
export const pauseFindByKey = (store: ClaimStore) => {
  const waiting: (() => void)[] = [];
  let paused = false;

  const pausedStore: ClaimStore = {
    ...store,
    findByKey: (key) =>
      paused
        ? new Promise((resolve, reject) => {
            waiting.push(() => {
              void store.findByKey(key).then(resolve, reject);
            });
          })
        : store.findByKey(key),
  };

  return {
    store: pausedStore,
    pause: () => {
      paused = true;
    },
    pending: () => waiting.length,
    releaseAll: () => {
      waiting.splice(0).forEach((release) => release());
    },
    releaseNext: () => {
      waiting.shift()?.();
    },
  };
};
