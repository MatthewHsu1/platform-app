import { describe, expect, it } from 'vitest';

import { makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { makeNumberBatch } from 'src/stock-picking-batch/number-batch';

type Batch = { name: string | null; isWave: boolean; pickingTypeId: string | null };

const setup = (batch: Batch) => {
  const claims = makeClaims(makeFakeClaimStore().store);
  const state = { batch: { ...batch }, numbersDrawn: 0 };
  const numberBatch = makeNumberBatch({
    withClaim: claims.withClaim,
    wait: () => new Promise((resolve) => setTimeout(resolve, 0)),
    readBatch: async () => ({ ...state.batch }),
    nameBatch: async () => {
      state.numbersDrawn += 1;
      await new Promise((resolve) => setTimeout(resolve, 0));
      return `BATCH/OUT/0000${state.numbersDrawn}`;
    },
    writeBatch: async (_batchId, data) => {
      state.batch = { ...state.batch, ...data };
    },
  });

  return { state, numberBatch };
};

describe('numberBatch', () => {
  it('draws one number when two transfers join one untyped batch at the same time', async () => {
    const { state, numberBatch } = setup({ name: 'New', isWave: false, pickingTypeId: null });
    const join = () => numberBatch('b1', { pickingTypeId: 'out', needsNumber: (current) => current.pickingTypeId === null });

    const names = await Promise.all([join(), join()]);

    expect(state.numbersDrawn).toBe(1);
    expect(names).toEqual(['BATCH/OUT/00001', 'BATCH/OUT/00001']);
    expect(state.batch).toEqual({ name: 'BATCH/OUT/00001', isWave: false, pickingTypeId: 'out' });
  });

  it('draws no number when the batch was numbered after this pass read it', async () => {
    const { state, numberBatch } = setup({ name: 'BATCH/OUT/00007', isWave: false, pickingTypeId: 'out' });

    const name = await numberBatch('b1', { pickingTypeId: 'out', needsNumber: (current) => current.name === 'New' });

    expect(name).toBe('BATCH/OUT/00007');
    expect(state.numbersDrawn).toBe(0);
  });
});
