import { describe, expect, it } from 'vitest';

import { CLAIM_STALE_MINUTES, claimKey, makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore, pauseFindByKey } from 'src/shared/claims/__tests__/fakes/fake-claim-store';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const KEY = claimKey('approve', 'record-1');

describe('takeClaim', () => {
  it('takes a free key and finds a fresh one held', async () => {
    const { store } = makeFakeClaimStore();
    const claims = makeClaims(store);

    expect(KEY).toBe('approve:record-1');
    expect(await claims.takeClaim(KEY, 'a')).toBe('taken');
    expect(await claims.takeClaim(KEY, 'b')).toBe('held');
  });

  it('finds a claim stale after 15 minutes without an end', async () => {
    const { store, advanceMinutes } = makeFakeClaimStore();
    const claims = makeClaims(store);
    await claims.takeClaim(KEY, 'a');

    advanceMinutes(CLAIM_STALE_MINUTES - 1);
    expect(await claims.takeClaim(KEY, 'b')).toBe('held');
    advanceMinutes(2);
    expect(await claims.takeClaim(KEY, 'b')).toBe('stale');
  });
});

describe('withClaim', () => {
  it('runs a stale member claim it takes over as its own, without the owner the stopped run stored on it', async () => {
    const { store, rows, advanceMinutes } = makeFakeClaimStore();
    const claims = makeClaims(store);
    await claims.takeClaims([KEY], 'merge-run', { steps: {}, owner: claimKey('batchMerge', 'kept-batch') });
    advanceMinutes(CLAIM_STALE_MINUTES + 1);
    let progressDuringRun: unknown;

    await claims.withClaim(KEY, async () => {
      progressDuringRun = rows.get(KEY)?.progress;
    });

    expect(progressDuringRun).toEqual({ steps: {} });
  });

  it('lets one of two simultaneous runs work and tells the other the record is held', async () => {
    const { store, rows } = makeFakeClaimStore();
    const claims = makeClaims(store);
    let finishFirst: () => void = () => {};
    let firstOutcome: Promise<unknown> = Promise.resolve();
    const firstStarted = new Promise<void>((started) => {
      firstOutcome = claims.withClaim(KEY, async () => {
        started();
        await new Promise<void>((resolve) => {
          finishFirst = resolve;
        });
        return 'saved once';
      });
    });
    await firstStarted;

    expect(await claims.withClaim(KEY, async () => 'saved twice')).toEqual({ kind: 'held' });
    finishFirst();
    expect(await firstOutcome).toEqual({ kind: 'done', result: 'saved once' });
    expect(rows.has(KEY)).toBe(false);
  });

  it('lets only one of two runs take over the same stale claim', async () => {
    const { store, advanceMinutes } = makeFakeClaimStore();
    const paused = pauseFindByKey(store);
    const claims = makeClaims(paused.store);
    await claims.takeClaim(KEY, 'stopped');
    advanceMinutes(CLAIM_STALE_MINUTES + 1);
    let bodies = 0;
    let openGate: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    const body = async () => {
      bodies += 1;
      await gate;
      return 'moved';
    };
    const outcomes: unknown[] = [];

    paused.pause();
    const runs = [claims.withClaim(KEY, body), claims.withClaim(KEY, body)].map((run) =>
      run.then((outcome) => outcomes.push(outcome)),
    );
    await flush();
    // Both runs judge the stopped claim stale before either takes it over.
    expect(paused.pending()).toBe(2);
    paused.releaseAll();
    for (let round = 0; round < 10 && outcomes.length === 0 && bodies < 2; round += 1) {
      await flush();
      paused.releaseNext();
    }
    await flush();

    expect(bodies).toBe(1);
    expect(outcomes).toEqual([{ kind: 'held' }]);
    openGate();
    await Promise.all(runs);
    expect(outcomes).toEqual([{ kind: 'held' }, { kind: 'done', result: 'moved' }]);
  });

  it('releases a stopped run by its id without freeing the run that took it over', async () => {
    const { store, advanceMinutes } = makeFakeClaimStore();
    const claims = makeClaims(store);
    await claims.takeClaim(KEY, 'stopped');
    advanceMinutes(CLAIM_STALE_MINUTES + 1);

    const outcome = await claims.withClaim(KEY, async () => {
      await claims.releaseClaim(KEY, 'stopped');
      return claims.takeClaim(KEY, 'next click');
    });

    expect(outcome).toEqual({ kind: 'done', result: 'held' });
  });

  it('releases the key when the run finishes, so the next click takes it', async () => {
    const { store } = makeFakeClaimStore();
    const claims = makeClaims(store);

    await claims.withClaim(KEY, async () => 'done');
    expect(await claims.takeClaim(KEY, 'next')).toBe('taken');
    await claims.releaseClaim(KEY);
    expect(await claims.takeClaim(KEY, 'again')).toBe('taken');
  });

  it('answers a finished run as done when removing its claim fails, and the row it leaves holds nothing', async () => {
    const { store, rows } = makeFakeClaimStore();
    const failingCleanUp = { ...store, destroy: async () => Promise.reject(new Error('network down')) };
    const claims = makeClaims(failingCleanUp);

    expect(await claims.withClaim(KEY, async () => 'ordered')).toEqual({ kind: 'done', result: 'ordered' });
    expect(rows.get(KEY)?.finishedAt).not.toBeNull();
    expect(await makeClaims(store).withClaim(KEY, async () => 'next click')).toEqual({
      kind: 'done',
      result: 'next click',
    });
  });

  it('answers a finished run as done when neither marking nor removing its claim works', async () => {
    const { store } = makeFakeClaimStore();
    const failingCleanUp = {
      ...store,
      updateWhere: async () => Promise.reject(new Error('network down')),
      destroy: async () => Promise.reject(new Error('network down')),
    };

    expect(await makeClaims(failingCleanUp).withClaim(KEY, async () => 'ordered')).toEqual({
      kind: 'done',
      result: 'ordered',
    });
  });

  it('keeps the claim of a run that stopped after its commit point, so a later run resumes it', async () => {
    const { store, rows } = makeFakeClaimStore();
    const claims = makeClaims(store);

    await expect(
      claims.withClaim(KEY, async (runId) => {
        const journal = await claims.openJournal(KEY, runId);
        await journal.commit();
        throw new Error('server stopped');
      }),
    ).rejects.toThrow('server stopped');
    expect(rows.get(KEY)?.finishedAt).toBeNull();
    expect(rows.get(KEY)?.progress?.committed).toBe(true);
  });

  it('frees the record and reports the error when a run fails before its commit point', async () => {
    const { store, rows } = makeFakeClaimStore();
    const claims = makeClaims(store);

    await expect(
      claims.withClaim(KEY, async (runId) => {
        const journal = await claims.openJournal(KEY, runId);
        await journal.step(
          'plan',
          async () => ({ moveId: 'm1' }),
          async () => {},
        );
        throw new Error('No rule has been found to replenish Desk in WH/Stock.');
      }),
    ).rejects.toThrow('No rule has been found to replenish Desk in WH/Stock.');
    expect(rows.has(KEY)).toBe(false);
    expect(await claims.withClaim(KEY, async () => 'next click')).toEqual({ kind: 'done', result: 'next click' });
  });
});

describe('the journal', () => {
  it('resumes a stale run: done steps are skipped and the stored plan is used again', async () => {
    const { store, advanceMinutes } = makeFakeClaimStore();
    const claims = makeClaims(store);
    const calls: string[] = [];
    let crash = true;

    const run = (runId: string) =>
      claims.openJournal(KEY, runId).then(async (journal) => {
        await journal.commit();
        await journal.step(
          'split',
          async () => {
            calls.push('plan split');
            return { newRowId: `row-for-${runId}` };
          },
          async (plan) => {
            calls.push(`split ${plan.newRowId}`);
          },
        );
        await journal.step(
          'lines',
          async () => {
            calls.push('plan lines');
            return { lineIds: ['l1', 'l2'] };
          },
          async (plan) => {
            calls.push(`lines ${plan.lineIds.join(',')}`);
            if (crash) {
              crash = false;
              throw new Error('server stopped');
            }
          },
        );
        return journal.resumed;
      });

    await expect(claims.withClaim(KEY, run)).rejects.toThrow('server stopped');
    expect(await claims.withClaim(KEY, run)).toEqual({ kind: 'held' });

    advanceMinutes(CLAIM_STALE_MINUTES + 1);
    expect(await claims.withClaim(KEY, run)).toEqual({ kind: 'done', result: true });
    expect(calls).toEqual(['plan split', 'split row-for-run-1', 'plan lines', 'lines l1,l2', 'lines l1,l2']);
  });

  it('tells the run that takes a stopped run over whether that run had passed its commit point', async () => {
    const { store, advanceMinutes } = makeFakeClaimStore();
    const claims = makeClaims(store);
    const committedSeen: boolean[] = [];

    for (const commitFirst of [false, true]) {
      const key = `${KEY}-${String(commitFirst)}`;
      await claims.takeClaim(key, 'stopped');
      const stopped = await claims.openJournal(key, 'stopped');
      await stopped.step(
        'plan',
        async () => ({ moveId: 'm1' }),
        async () => {},
      );
      if (commitFirst) {
        await stopped.commit();
      }
      advanceMinutes(CLAIM_STALE_MINUTES + 1);
      await claims.withClaim(key, async (runId) => {
        committedSeen.push((await claims.openJournal(key, runId)).committed);
      });
    }

    expect(committedSeen).toEqual([false, true]);
  });

  it('stops a run whose claim another run took over', async () => {
    const { store, advanceMinutes } = makeFakeClaimStore();
    const claims = makeClaims(store);
    await claims.takeClaim(KEY, 'old');
    const oldJournal = await claims.openJournal(KEY, 'old');

    advanceMinutes(CLAIM_STALE_MINUTES + 1);
    await claims.withClaim(KEY, async () => 'taken over');

    await expect(
      oldJournal.step(
        'split',
        async () => 1,
        async () => {},
      ),
    ).rejects.toThrow('The claim approve:record-1 was taken over by another run.');
  });

  it('starts fresh after a finished run whose claim was not removed', async () => {
    const { store, rows } = makeFakeClaimStore();
    const claims = makeClaims(store);
    rows.set(KEY, {
      id: 'c',
      key: KEY,
      runId: 'finished',
      startedAt: '2026-10-08T09:59:00.000Z',
      finishedAt: '2026-10-08T09:59:30.000Z',
      progress: { steps: { split: { plan: { newRowId: 'old' }, done: true } } },
    });
    const planned: string[] = [];

    await claims.withClaim(KEY, async (runId) => {
      const journal = await claims.openJournal(KEY, runId);
      await journal.step(
        'split',
        async () => {
          planned.push('planned again');
          return { newRowId: 'new' };
        },
        async () => {},
      );
    });
    expect(planned).toEqual(['planned again']);
  });
});

describe('findStaleClaims', () => {
  it('lists unfinished claims older than the given minutes', async () => {
    const { store, advanceMinutes } = makeFakeClaimStore();
    const claims = makeClaims(store);
    await claims.takeClaim(claimKey('approve', 's1'), 'r1');
    advanceMinutes(20);
    await claims.takeClaim(claimKey('export', 'q1'), 'r2');

    expect(await claims.findStaleClaims(CLAIM_STALE_MINUTES)).toEqual([{ key: 'approve:s1', runId: 'r1' }]);
  });
});

describe('takeClaims', () => {
  const POINTER = { steps: { plan: { plan: 'part of a batch', done: true } }, committed: true };

  it('takes the free keys for one run with their progress, and tells a held key from a stale one', async () => {
    const { store, rows, advanceMinutes } = makeFakeClaimStore();
    const claims = makeClaims(store);
    await claims.takeClaim('move:c', 'stopped');
    advanceMinutes(CLAIM_STALE_MINUTES + 1);
    await claims.takeClaim('move:b', 'busy');

    expect(await claims.takeClaims(['move:a', 'move:b', 'move:c'], 'batch', POINTER)).toEqual({
      taken: ['move:a'],
      held: ['move:b'],
      stale: ['move:c'],
    });
    expect({ runId: rows.get('move:a')?.runId, progress: rows.get('move:a')?.progress }).toEqual({
      runId: 'batch',
      progress: POINTER,
    });
  });

  it('a key another run takes between the read and the write is held, and the other keys are still taken', async () => {
    const { store, rows } = makeFakeClaimStore();
    const racing = {
      ...store,
      findByKeys: async (keys: string[]) => {
        const found = await store.findByKeys(keys);
        await store.create({ key: 'move:b', runId: 'other', startedAt: store.now().toISOString() });
        return found;
      },
    };
    const claims = makeClaims(racing);

    expect(await claims.takeClaims(['move:a', 'move:b'], 'batch', POINTER)).toEqual({
      taken: ['move:a'],
      held: ['move:b'],
      stale: [],
    });
    expect([rows.get('move:a')?.runId, rows.get('move:b')?.runId]).toEqual(['batch', 'other']);
  });

  it('releaseClaims frees the keys this run holds and leaves a key another run took over', async () => {
    const { store, rows } = makeFakeClaimStore();
    const claims = makeClaims(store);
    await claims.takeClaims(['move:a', 'move:b'], 'batch', POINTER);
    rows.set('move:b', { ...(rows.get('move:b') as NonNullable<ReturnType<typeof rows.get>>), runId: 'resumer' });

    await claims.releaseClaims(['move:a', 'move:b'], 'batch');

    expect([...rows.keys()]).toEqual(['move:b']);
  });
});

describe('sweepFinishedClaims', () => {
  it('removes the rows of runs that finished longer ago than the stale window, and keeps the rest', async () => {
    const { store, rows, advanceMinutes } = makeFakeClaimStore();
    const claims = makeClaims(store);
    const row = (key: string, finishedAt: string | null) =>
      rows.set(key, { id: key, key, runId: `run-${key}`, startedAt: '2026-10-08T09:00:00.000Z', finishedAt, progress: null });
    advanceMinutes(60);
    row('procurement:old', '2026-10-08T10:30:00.000Z');
    row('procurement:recent', '2026-10-08T10:50:00.000Z');
    row('validate:stopped', null);

    await claims.sweepFinishedClaims();

    expect([...rows.keys()]).toEqual(['procurement:recent', 'validate:stopped']);
  });
});
