import { describe, expect, it } from 'vitest';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { makeAddToBatch } from 'src/stock-picking-batch/actions/add-to-batch';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { StockUserError } from 'src/stock/stock-errors';

type BatchRow = { id: string; name: string; state: BatchState; pickingTypeId: string | null; isWave: boolean; responsibleId: string | null };

// Two ready delivery transfers and one open batch of deliveries, in memory.
const makeFake = () => {
  const batches = new Map<string, BatchRow>([
    ['b1', { id: 'b1', name: 'BATCH/OUT/00001', state: 'IN_PROGRESS', pickingTypeId: 'out', isWave: false, responsibleId: null }],
  ]);
  const pickings = new Map([
    ['t1', { id: 't1', name: 'OUT/1', state: 'ASSIGNED', pickingTypeId: 'out', batchId: null as string | null }],
    ['t2', { id: 't2', name: 'OUT/2', state: 'ASSIGNED', pickingTypeId: 'out', batchId: null as string | null }],
    ['t3', { id: 't3', name: 'IN/1', state: 'ASSIGNED', pickingTypeId: 'in', batchId: null as string | null }],
  ]);
  const steps: string[] = [];
  const hidden = new Set<string>();
  const faults = { failConfirm: false };
  const validating = new Set<string>();

  const add = makeAddToBatch({
    readPickings: async (ids) => ids.flatMap((id) => {
      const picking = pickings.get(id);

      return picking === undefined ? [] : [{ ...picking }];
    }),
    readChosenBatch: async (batchId) => (hidden.has(batchId) ? undefined : batches.get(batchId)),
    createBatch: async (batchId, values) => {
      if (!batches.has(batchId)) {
        steps.push('create');
        batches.set(batchId, { id: batchId, name: 'BATCH/OUT/00002', state: 'DRAFT', ...values });
      }
      return batches.get(batchId)?.state;
    },
    moveTransfers: async (ids, batchId) => {
      steps.push(`move ${ids.join(',')}`);
      ids.forEach((id) => {
        const picking = pickings.get(id);

        if (picking !== undefined) {
          picking.batchId = batchId;
        }
      });
    },
    confirmBatch: async (batchId) => {
      if (faults.failConfirm) {
        faults.failConfirm = false;
        steps.push('confirm refused');
        throw new StockUserError('Only draft transfers can be marked as to do: {names}.', { names: 'OUT/1' });
      }
      steps.push('confirm');
      const batch = batches.get(batchId);

      if (batch !== undefined) {
        batch.state = 'IN_PROGRESS';
      }
    },
    validatingBatchIds: async (batchIds) => batchIds.filter((batchId) => validating.has(batchId)),
    readBatchName: async (batchId) => batches.get(batchId)?.name ?? '',
  });

  return { add, batches, pickings, steps, hidden, faults, validating };
};

// The text and the values a refusal is translated with.
const refusalOf = async (attempt: Promise<unknown>) => {
  try {
    await attempt;
  } catch (error) {
    if (error instanceof StockUserError) {
      return { message: error.message, values: error.values };
    }
    throw error;
  }
  throw new Error('The request was not refused');
};

const newRequest = {
  pickingIds: ['t1', 't2'],
  mode: 'NEW' as const,
  batchId: null,
  responsibleId: 'me',
  description: 'Morning round',
  isCreateDraft: false,
  runId: 'run-1',
};

describe('add to batch', () => {
  it('makes the batch, puts the transfers in it, then confirms it', async () => {
    const fake = makeFake();

    expect(await fake.add(newRequest)).toEqual({ created: true, name: 'BATCH/OUT/00002' });
    expect(fake.steps).toEqual(['create', 'move t1,t2', 'confirm']);

    const batchId = fake.pickings.get('t1')?.batchId ?? '';

    expect(fake.pickings.get('t2')?.batchId).toBe(batchId);
    expect(fake.batches.get(batchId)).toMatchObject({
      state: 'IN_PROGRESS',
      pickingTypeId: 'out',
      responsibleId: 'me',
      description: 'Morning round',
      isWave: false,
    });
  });

  it('leaves a batch made as a draft unconfirmed', async () => {
    const fake = makeFake();

    await fake.add({ ...newRequest, isCreateDraft: true });

    expect(fake.steps).toEqual(['create', 'move t1,t2']);
  });

  it('makes no second batch when the same request is sent again', async () => {
    const fake = makeFake();

    await fake.add(newRequest);
    await fake.add(newRequest);

    expect(fake.batches.size).toBe(2);
    expect(fake.steps.filter((step) => step === 'create')).toHaveLength(1);
  });

  it('finishes a request whose confirm was refused when it is sent again', async () => {
    const fake = makeFake();

    fake.faults.failConfirm = true;
    await expect(fake.add(newRequest)).rejects.toThrow(StockUserError);
    expect(await fake.add(newRequest)).toEqual({ created: true, name: 'BATCH/OUT/00002' });

    expect(fake.steps).toEqual(['create', 'move t1,t2', 'confirm refused', 'confirm']);
    expect(fake.batches.size).toBe(2);
  });

  it('does not put the transfers back into the batch it made once that batch is closed', async () => {
    const fake = makeFake();

    await fake.add({ ...newRequest, isCreateDraft: true });
    const batchId = fake.pickings.get('t1')?.batchId ?? '';
    const made = fake.batches.get(batchId);

    if (made !== undefined) {
      made.state = 'CANCEL';
    }
    fake.pickings.forEach((picking) => {
      picking.batchId = null;
    });
    fake.steps.length = 0;

    expect(await refusalOf(fake.add({ ...newRequest, isCreateDraft: true }))).toEqual({
      message: BATCH_MESSAGES.madeClosed,
      values: {},
    });
    expect(fake.steps).toEqual([]);
    expect(fake.pickings.get('t1')?.batchId).toBeNull();
  });

  it('puts the transfers in the chosen batch without confirming anything', async () => {
    const fake = makeFake();

    expect(await fake.add({ ...newRequest, mode: 'EXISTING', batchId: 'b1' })).toEqual({ created: false, name: 'BATCH/OUT/00001' });
    expect(fake.steps).toEqual(['move t1,t2']);
    expect(fake.pickings.get('t1')?.batchId).toBe('b1');
  });

  it('refuses to add to a batch while its Validate runs, and to take a transfer out of one', async () => {
    const fake = makeFake();

    fake.validating.add('b1');
    expect(await refusalOf(fake.add({ ...newRequest, mode: 'EXISTING', batchId: 'b1' }))).toEqual({
      message: CLAIM_HELD_MESSAGE,
      values: {},
    });
    const t1 = fake.pickings.get('t1');

    if (t1 !== undefined) {
      t1.batchId = 'b1';
    }
    expect(await refusalOf(fake.add({ ...newRequest, pickingIds: ['t1', 't2'] }))).toEqual({ message: CLAIM_HELD_MESSAGE, values: {} });
    expect(fake.steps).toEqual([]);
    expect(fake.pickings.get('t2')?.batchId).toBeNull();
  });

  it('writes nothing when it refuses', async () => {
    const fake = makeFake();

    expect(await refusalOf(fake.add({ ...newRequest, pickingIds: ['t1', 't3'] }))).toEqual({
      message: BATCH_MESSAGES.incompatible,
      values: { batch: 'New', transfers: 'IN/1' },
    });
    expect(await refusalOf(fake.add({ ...newRequest, mode: 'EXISTING', batchId: 'b1', pickingIds: ['t3', 't1'] }))).toEqual({
      message: BATCH_MESSAGES.incompatible,
      values: { batch: 'BATCH/OUT/00001', transfers: 'IN/1' },
    });
    expect(await refusalOf(fake.add({ ...newRequest, mode: 'EXISTING', batchId: null }))).toEqual({
      message: BATCH_MESSAGES.chooseBatch,
      values: {},
    });
    fake.hidden.add('b1');
    expect(await refusalOf(fake.add({ ...newRequest, mode: 'EXISTING', batchId: 'b1' }))).toEqual({
      message: BATCH_MESSAGES.notFound,
      values: {},
    });
    expect(fake.steps).toEqual([]);
    expect(fake.batches.size).toBe(1);
  });
});
