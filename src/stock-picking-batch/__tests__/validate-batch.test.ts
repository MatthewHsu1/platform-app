import { describe, expect, it } from 'vitest';

import { makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { makeBatchValidate } from 'src/stock-picking-batch/validate-batch';
import { type ValidateResult } from 'src/stock/picking/types/validate-result.type';

const PLAN = {
  kind: 'validate' as const,
  batchName: 'BATCH/OUT/00001',
  toValidateIds: ['p1', 'p2'],
  pickingsToDetach: ['p3'],
  emptyWaitingIds: [],
  emptyWaitingNames: [],
  locale: 'en',
  answer: {},
};

// A batch run against fakes: the transfers' states, a log of what ran, and a
// Validate that answers as the test says (or stops the server).
const setup = (validate: (states: Map<string, string>) => ValidateResult) => {
  const claimStore = makeFakeClaimStore();
  const claims = makeClaims(claimStore.store);
  const states = new Map([
    ['p1', 'ASSIGNED'],
    ['p2', 'ASSIGNED'],
  ]);
  const log: string[] = [];
  let resumeFinishes = true;

  const run = makeBatchValidate({
    withClaim: claims.withClaim,
    openJournal: claims.openJournal,
    heldClaimKeys: claims.heldClaimKeys,
    planRun: async () => PLAN,
    validatePickings: async () => {
      log.push('validate');
      return validate(states);
    },
    resumeValidate: async (pickingId) => {
      log.push(`resume ${pickingId}`);
      if (resumeFinishes) {
        await claimStore.store.destroy({ key: `validate:${pickingId}` });
        states.set(pickingId, 'DONE');
      }
    },
    afterValidateBatch: async () => {
      log.push('hook');
    },
    readPickingStates: async (ids) => ids.map((id) => ({ id, state: states.get(id) ?? 'ASSIGNED' })),
    writeNotes: async () => {
      log.push('notes');
    },
    recomputeBatchState: async () => {
      log.push('recompute');
    },
  });

  return {
    run,
    claimStore,
    states,
    log,
    resumeStuck: () => {
      resumeFinishes = false;
    },
  };
};

const done: ValidateResult = { kind: 'done', backorderIds: [], doneIds: [], printouts: [] };

// Validate stopped half-way: one transfer done, the other's own run stopped while holding its claim.
const stopMidway = (states: Map<string, string>, store: ReturnType<typeof makeFakeClaimStore>['store']) => {
  states.set('p1', 'DONE');
  void store.create({ key: 'validate:p2', runId: 'stopped', startedAt: '2026-10-08T10:00:00.000Z' });
  throw new Error('server stopped');
};

describe('batch Validate', () => {
  it('writes the notes after Validate and its batch hook, when the transfers were validated', async () => {
    const { run, log } = setup((states) => {
      states.set('p1', 'DONE');
      states.set('p2', 'DONE');
      return done;
    });

    await run.validateBatch('b1', {});

    expect(log).toEqual(['validate', 'notes', 'recompute']);
  });

  it('writes the notes when Validate asks a question: the click is kept, as the answer validates the same transfers', async () => {
    const { run, log } = setup(() => ({ kind: 'needsAnswer', question: 'backorder', pickingIds: ['p1'] }));

    expect(await run.validateBatch('b1', {})).toEqual({ kind: 'needsAnswer', question: 'backorder', pickingIds: ['p1'] });
    expect(log).toEqual(['validate', 'notes', 'recompute']);
  });

  it('writes no note when Validate refuses before any transfer is done, as the refused click changes nothing', async () => {
    const { run, log } = setup(() => ({ kind: 'refused', reason: 'You need to supply a Lot/Serial number for products P.' }));

    await expect(run.validateBatch('b1', {})).rejects.toThrow('You need to supply a Lot/Serial number for products P.');
    expect(log).toEqual(['validate', 'recompute']);
  });

  it('a resume finishes the transfers stopped inside Validate first, then the batch hook, then the notes', async () => {
    const context = setup(() => {
      throw new Error('unused');
    });
    const { claimStore, states, log } = context;
    const stopping = makeBatchValidateStopping(context);

    await expect(stopping.validateBatch('b1', {})).rejects.toThrow('server stopped');
    claimStore.advanceMinutes(16);
    log.length = 0;

    await context.run.resumeBatchValidate('b1');

    expect(log).toEqual(['resume p1', 'resume p2', 'hook', 'notes', 'recompute']);
    expect(states.get('p2')).toBe('DONE');
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('a resume keeps the batch claim for a later pass while a transfer stopped inside Validate is still held', async () => {
    const context = setup(() => {
      throw new Error('unused');
    });
    const { claimStore, log } = context;
    const stopping = makeBatchValidateStopping(context);

    await expect(stopping.validateBatch('b1', {})).rejects.toThrow('server stopped');
    claimStore.advanceMinutes(16);
    context.resumeStuck();
    log.length = 0;

    await expect(context.run.resumeBatchValidate('b1')).rejects.toThrow('validate:p2');
    expect(log).toEqual(['resume p1', 'resume p2']);
    expect([...claimStore.rows.keys()]).toEqual(['batchValidate:b1', 'validate:p2']);
  });
});

// The same run whose Validate stops the server after one transfer is done.
const makeBatchValidateStopping = ({ claimStore, states }: ReturnType<typeof setup>) => {
  const claims = makeClaims(claimStore.store);

  return makeBatchValidate({
    withClaim: claims.withClaim,
    openJournal: claims.openJournal,
    heldClaimKeys: claims.heldClaimKeys,
    planRun: async () => PLAN,
    validatePickings: async () => stopMidway(states, claimStore.store),
    resumeValidate: async () => {},
    afterValidateBatch: async () => {},
    readPickingStates: async (ids) => ids.map((id) => ({ id, state: states.get(id) ?? 'ASSIGNED' })),
    writeNotes: async () => {},
    recomputeBatchState: async () => {},
  });
};
