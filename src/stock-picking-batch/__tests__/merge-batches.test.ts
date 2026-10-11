import { describe, expect, it } from 'vitest';

import { CLAIM_HELD_MESSAGE, makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { makeMergeBatches } from 'src/stock-picking-batch/actions/merge-batches';
import { type MergeBatch } from 'src/stock-picking-batch/types/merge-batch.type';

type BatchRow = MergeBatch & { name: string };

class Stopped extends Error {}

const batchRow = (id: string, values: Partial<BatchRow> = {}): BatchRow => ({
  id,
  name: `BATCH/OUT/${id}`,
  state: 'IN_PROGRESS',
  isWave: false,
  pickingTypeId: 'out',
  scheduledDate: '2025-09-02T10:00:00.000Z',
  responsibleId: 'me',
  description: null,
  ...values,
});

// Two in-progress batches, each with one ready transfer, in memory.
const makeFakeMerge = () => {
  const claimStore = makeFakeClaimStore();
  const batches = new Map<string, BatchRow>([
    ['A', batchRow('A', { description: 'Great batch' })],
    ['B', batchRow('B', { description: 'Amazing batch', scheduledDate: '2025-09-01T10:00:00.000Z' })],
  ]);
  const pickings = new Map([
    ['OUT/1', { id: 'OUT/1', name: 'OUT/1', state: 'ASSIGNED', pickingTypeId: 'out', batchId: 'A' as string | null }],
    ['OUT/2', { id: 'OUT/2', name: 'OUT/2', state: 'ASSIGNED', pickingTypeId: 'out', batchId: 'B' as string | null }],
  ]);
  const faults = { stopAtTransfers: false, gate: null as Promise<void> | null };
  const validating = new Set<string>();

  const merge = makeMergeBatches({
    claims: makeClaims(claimStore.store),
    readBatches: async (batchIds) => {
      await faults.gate;
      return batchIds.flatMap((id) => batches.get(id) ?? []);
    },
    readMembers: async (batchIds) =>
      [...pickings.values()].flatMap((picking) =>
        picking.batchId !== null && batchIds.includes(picking.batchId) ? [{ ...picking, batchId: picking.batchId }] : [],
      ),
    findBatch: async (batchId) => batches.get(batchId),
    readLocale: async () => 'en',
    validatingBatchIds: async (batchIds) => batchIds.filter((batchId) => validating.has(batchId)),
    moveTransfers: async (fromBatchIds, toBatchId) => {
      if (faults.stopAtTransfers) {
        faults.stopAtTransfers = false;
        throw new Stopped();
      }
      for (const picking of pickings.values()) {
        if (picking.batchId !== null && fromBatchIds.includes(picking.batchId)) {
          picking.batchId = toBatchId;
        }
      }
    },
    writeValues: async (batchId, values) => {
      const batch = batches.get(batchId);

      if (batch !== undefined) {
        batches.set(batchId, { ...batch, ...values });
      }
    },
    assignResponsible: async () => {},
    destroyBatches: async (batchIds) => {
      batchIds.forEach((id) => batches.delete(id));
    },
    recomputeBatch: async () => {},
  });

  const transfersByBatch = () =>
    Object.fromEntries([...batches.keys()].map((id) => [id, [...pickings.values()].filter((picking) => picking.batchId === id).map((picking) => picking.id)]));

  return { claimStore, batches, pickings, faults, validating, merge, transfersByBatch };
};

describe('mergeBatches', () => {
  it('moves the transfers into the first batch, takes the earliest batch values and deletes the others', async () => {
    const fake = makeFakeMerge();

    await fake.merge.mergeBatches(['A', 'B']);

    expect({
      transfers: fake.transfersByBatch(),
      description: fake.batches.get('A')?.description,
      scheduledDate: fake.batches.get('A')?.scheduledDate,
      claims: fake.claimStore.rows.size,
    }).toEqual({
      transfers: { A: ['OUT/1', 'OUT/2'] },
      description: 'Amazing batch',
      scheduledDate: '2025-09-01T10:00:00.000Z',
      claims: 0,
    });
  });

  it('refuses to merge a batch whose Validate runs, kept or emptied, and moves nothing', async () => {
    const fake = makeFakeMerge();

    fake.validating.add('B');

    await expect(fake.merge.mergeBatches(['A', 'B'])).rejects.toThrow(CLAIM_HELD_MESSAGE);
    await expect(fake.merge.mergeBatches(['B', 'A'])).rejects.toThrow(CLAIM_HELD_MESSAGE);
    expect(fake.transfersByBatch()).toEqual({ A: ['OUT/1'], B: ['OUT/2'] });
  });

  it('refuses a merge of the same batches in the other order while the first one runs, and no batch loses its transfers', async () => {
    const fake = makeFakeMerge();
    let open = () => {};
    fake.faults.gate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const first = fake.merge.mergeBatches(['A', 'B']);

    for (let turn = 0; turn < 100 && fake.claimStore.rows.size < 2; turn += 1) {
      await Promise.resolve();
    }
    fake.faults.gate = null;
    const second = fake.merge.mergeBatches(['B', 'A']).catch((error: Error) => error.message);

    expect(await second).toBe(CLAIM_HELD_MESSAGE);
    open();
    await first;
    expect({ transfers: fake.transfersByBatch(), claims: fake.claimStore.rows.size }).toEqual({
      transfers: { A: ['OUT/1', 'OUT/2'] },
      claims: 0,
    });
  });

  it('finishes a stopped merge without writing when the kept batch was deleted meanwhile', async () => {
    const fake = makeFakeMerge();
    fake.faults.stopAtTransfers = true;

    await expect(fake.merge.mergeBatches(['A', 'B'])).rejects.toBeInstanceOf(Stopped);
    fake.batches.delete('A');
    fake.claimStore.advanceMinutes(16);
    await fake.merge.resumeBatchMerge('A');

    expect({ transfers: fake.transfersByBatch(), claims: fake.claimStore.rows.size }).toEqual({
      transfers: { B: ['OUT/2'] },
      claims: 0,
    });
  });

  it('finishes a stopped merge first when a new merge keeps the same batch again', async () => {
    const fake = makeFakeMerge();
    fake.faults.stopAtTransfers = true;

    await expect(fake.merge.mergeBatches(['A', 'B'])).rejects.toBeInstanceOf(Stopped);
    fake.claimStore.advanceMinutes(16);
    const second = await fake.merge.mergeBatches(['A', 'B']).catch((error: Error) => error.message);

    expect({ second, transfers: fake.transfersByBatch(), claims: fake.claimStore.rows.size }).toEqual({
      second: CLAIM_HELD_MESSAGE,
      transfers: { A: ['OUT/1', 'OUT/2'] },
      claims: 0,
    });
  });

  it('finishes a stopped merge first when a new merge keeps one of its other batches', async () => {
    const fake = makeFakeMerge();
    fake.faults.stopAtTransfers = true;

    await expect(fake.merge.mergeBatches(['A', 'B'])).rejects.toBeInstanceOf(Stopped);
    fake.claimStore.advanceMinutes(16);
    const second = await fake.merge.mergeBatches(['B', 'A']).catch((error: Error) => error.message);

    expect({ second, transfers: fake.transfersByBatch(), claims: fake.claimStore.rows.size }).toEqual({
      second: CLAIM_HELD_MESSAGE,
      transfers: { A: ['OUT/1', 'OUT/2'] },
      claims: 0,
    });
  });
});
