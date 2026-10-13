import { graphqlClaimStore } from 'src/shared/claims/claim-store';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ClaimKey } from 'src/shared/claims/types/claim-key.type';
import { type ClaimProgress } from 'src/shared/claims/types/claim-progress.type';
import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';
import { type ClaimStore } from 'src/shared/claims/types/claim-store.type';

export const CLAIM_HELD_MESSAGE = 'This record is being processed. Try again in a moment.';
export const CLAIM_STALE_MINUTES = 15;

export const claimKey = (action: string, recordId: string): ClaimKey => `${action}:${recordId}`;

const withoutOwner = (progress: ClaimProgress): ClaimProgress =>
  Object.fromEntries(Object.entries(progress).filter(([name]) => name !== 'owner')) as ClaimProgress;

const minutesBefore = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

export const makeClaims = (store: ClaimStore) => {
  // A run that finished but was not removed holds nothing.
  const isStale = (row: ClaimRow) => row.finishedAt !== null || row.startedAt < minutesBefore(store.now(), CLAIM_STALE_MINUTES);

  // The row a 'stale' answer was judged on, so a take-over can match that run only.
  const judgeClaim = async (
    key: ClaimKey,
    runId: string,
  ): Promise<{ outcome: 'taken' | 'held' } | { outcome: 'stale'; row: ClaimRow }> => {
    if ((await store.create({ key, runId, startedAt: store.now().toISOString() })) === 'created') {
      return { outcome: 'taken' };
    }
    const existing = await store.findByKey(key);

    if (existing === null) {
      return {
        outcome: (await store.create({ key, runId, startedAt: store.now().toISOString() })) === 'created' ? 'taken' : 'held',
      };
    }
    return isStale(existing) ? { outcome: 'stale', row: existing } : { outcome: 'held' };
  };

  const takeClaim = async (key: ClaimKey, runId: string) => (await judgeClaim(key, runId)).outcome;

  // Takes the free keys for one run, each with `progress` stored from the start, in one write when no other run
  // takes one meanwhile. A stale key is not taken over: the caller decides what its stopped run needs first.
  const takeClaims = async (keys: ClaimKey[], runId: string, progress: ClaimProgress) => {
    const existing = new Map((await store.findByKeys(keys)).map((row) => [row.key, row]));
    const free = keys.filter((key) => !existing.has(key));
    const startedAt = store.now().toISOString();
    const taken: ClaimKey[] = [];
    const held: ClaimKey[] = [];

    if (free.length > 0 && (await store.createMany(free.map((key) => ({ key, runId, startedAt, progress })))) === 'created') {
      taken.push(...free);
    } else {
      // The unique key decides each one; a row of this run may already be there from a write cut short.
      for (const key of free) {
        if ((await store.create({ key, runId, startedAt, progress })) === 'created' || (await store.findByKey(key))?.runId === runId) {
          taken.push(key);
        } else {
          held.push(key);
        }
      }
    }
    for (const row of existing.values()) {
      if (!isStale(row)) {
        held.push(row.key);
      }
    }

    return {
      taken,
      held: keys.filter((key) => held.includes(key)),
      stale: keys.filter((key) => existing.has(key) && isStale(existing.get(key) as ClaimRow)),
    };
  };

  // Only the keys this run still holds: one another run took over stays with it.
  const releaseClaims = (keys: ClaimKey[], runId: string) => (keys.length === 0 ? Promise.resolve() : store.destroyMany({ keys, runId }));

  // Without a run id it frees whoever holds the key; a resumer passes the stopped run's id so a run that
  // took the key over meanwhile keeps it.
  const releaseClaim = (key: ClaimKey, runId?: string) => store.destroy({ key, runId });

  // The update matches the run judged stale: of two runs taking it over, only the first finds it. When that
  // row is gone, the create on the unique key lets one run in. The run taking it over holds the key as its own
  // main claim, so an owner a stopped run stored on it as a member claim no longer applies.
  const takeOver = async (key: ClaimKey, runId: string, stale: ClaimRow) =>
    (await store.updateWhere(
      { key, runId: stale.runId },
      {
        runId,
        startedAt: store.now().toISOString(),
        finishedAt: null,
        ...(stale.finishedAt !== null
          ? { progress: null }
          : stale.progress?.owner !== undefined
            ? { progress: withoutOwner(stale.progress) }
            : {}),
      },
    )) || (await store.create({ key, runId, startedAt: store.now().toISOString() })) === 'created';

  // Before its commit point the run wrote nothing that needs finishing: the record is free again. A failed
  // clean-up leaves the claim to go stale, and the run's own error is the one reported.
  const freeUncommitted = async (key: ClaimKey, runId: string) => {
    try {
      if ((await store.findByKey(key))?.progress?.committed !== true) {
        await store.destroy({ key, runId });
      }
    } catch {
      return;
    }
  };

  // `keepOnError` keeps an uncommitted claim on an error when the run says so:
  // another record may already count on it being there.
  const withClaim = async <TResult>(
    key: ClaimKey,
    run: (runId: string) => Promise<TResult>,
    options: { keepOnError?: () => boolean } = {},
  ): Promise<{ kind: 'done'; result: TResult } | { kind: 'held' }> => {
    const runId = store.newRunId();
    const judged = await judgeClaim(key, runId);

    if (judged.outcome === 'held' || (judged.outcome === 'stale' && !(await takeOver(key, runId, judged.row)))) {
      return { kind: 'held' };
    }
    let result: TResult;

    try {
      result = await run(runId);
    } catch (error) {
      if (options.keepOnError?.() !== true) {
        await freeUncommitted(key, runId);
      }
      throw error;
    }

    // The work is done, so a failed clean-up must not fail the call: a retry would do the work again. A row
    // marked finished holds nothing, and the next run starts fresh on it; one that could not be marked goes
    // stale, and its resume finds every step done.
    await store.updateWhere({ key, runId }, { finishedAt: store.now().toISOString() }).catch(() => false);
    await store.destroy({ key, runId }).catch(() => undefined);

    return { kind: 'done', result };
  };

  // The claims on these keys, finished or not, with the run holding each and what it stored: one read for many records.
  const findClaims = (keys: ClaimKey[]) => (keys.length === 0 ? Promise.resolve([]) : store.findByKeys(keys));

  const heldClaimKeys = async (keys: ClaimKey[]) => (await findClaims(keys)).map((row) => row.key);

  // A stale claim a run took beside its own names its owner. Before anyone takes it over, the owner's stopped run
  // is finished with `finishOwner`, so its plan is not cut short: 'none' when the key has no unfinished owner,
  // 'finished' when the owner's run was finished now, 'running' while the owner's run is still going.
  const settleOwnedClaim = async (
    key: ClaimKey,
    finishOwner: (ownerKey: ClaimKey) => Promise<void>,
  ): Promise<'none' | 'finished' | 'running'> => {
    const row = await store.findByKey(key);
    const owner = row?.progress?.owner;

    if (row === null || owner === undefined || !isStale(row)) {
      return 'none';
    }
    const ownerRow = await store.findByKey(owner);

    if (ownerRow === null || ownerRow.finishedAt !== null) {
      return 'none';
    }
    if (!isStale(ownerRow)) {
      return 'running';
    }
    await finishOwner(owner);
    const after = await store.findByKey(owner);

    return after === null || after.finishedAt !== null ? 'finished' : 'running';
  };

  // A finished row holds nothing, and the stale scan skips it: one whose removal failed is removed here once the
  // stale window has passed.
  const sweepFinishedClaims = () => store.destroyFinished(minutesBefore(store.now(), CLAIM_STALE_MINUTES));

  const findStaleClaims = async (olderThanMinutes: number) =>
    (await store.findStale(minutesBefore(store.now(), olderThanMinutes))).map((row) => ({ key: row.key, runId: row.runId }));

  const openJournal = async (key: ClaimKey, runId: string): Promise<ClaimJournal> => {
    const row = await store.findByKey(key);
    const progress: ClaimProgress = row?.progress ?? { steps: {} };
    const resumed = Object.keys(progress.steps).length > 0;
    const committed = progress.committed === true;

    const save = async () => {
      if (!(await store.updateWhere({ key, runId }, { progress }))) {
        throw new Error(`The claim ${key} was taken over by another run.`);
      }
    };

    const step = async <TPlan>(name: string, plan: () => Promise<TPlan>, work: (plan: TPlan) => Promise<void>) => {
      const entry = progress.steps[name];

      if (entry?.done === true) {
        return entry.plan as TPlan;
      }
      const stored = entry === undefined ? await plan() : (entry.plan as TPlan);

      if (entry === undefined) {
        progress.steps[name] = { plan: stored, done: false };
        await save();
      }
      await work(stored);
      progress.steps[name] = { plan: stored, done: true };
      await save();

      return stored;
    };

    const commit = async () => {
      if (progress.committed !== true) {
        progress.committed = true;
        await save();
      }
    };

    return { runId, resumed, committed, step, commit };
  };

  return {
    takeClaim,
    takeClaims,
    releaseClaim,
    releaseClaims,
    withClaim,
    findClaims,
    heldClaimKeys,
    settleOwnedClaim,
    findStaleClaims,
    sweepFinishedClaims,
    openJournal,
    isStaleClaim: isStale,
  };
};

export const {
  takeClaim,
  takeClaims,
  releaseClaim,
  releaseClaims,
  withClaim,
  findClaims,
  heldClaimKeys,
  settleOwnedClaim,
  findStaleClaims,
  sweepFinishedClaims,
  openJournal,
  isStaleClaim,
} = makeClaims(graphqlClaimStore);
