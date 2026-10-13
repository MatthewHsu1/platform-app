import { describe, expect, it } from 'vitest';

import { makeAfterValidateBatch } from 'src/stock-picking-batch/after-validate-batch';

type Picking = { id: string; state: string; batchId: string | null; backorderId: string | null };

// Transfers and batches in memory. A batch is done once all its transfers are,
// and only when its state is recomputed. Auto batch joins the first open batch
// not being validated, else gives the transfer a batch of its own.
const world = (pickings: Picking[], batches: Record<string, string>) => {
  const rows = new Map(pickings.map((picking) => [picking.id, { ...picking }]));
  const batchStates = new Map(Object.entries(batches));
  const log: string[] = [];
  let failAutoBatch = false;

  const afterValidateBatch = makeAfterValidateBatch({
    readPickings: async (ids) => ids.flatMap((id) => (rows.has(id) ? [{ ...(rows.get(id) as Picking) }] : [])),
    readBackorders: async (ids) =>
      [...rows.values()].filter((row) => row.backorderId !== null && ids.includes(row.backorderId)) as { id: string; backorderId: string }[],
    readMembers: async (batchIds) =>
      [...rows.values()].filter((row) => row.batchId !== null && batchIds.includes(row.batchId)) as { id: string; state: string; batchId: string }[],
    clearBatch: async (ids) => {
      ids.forEach((id) => {
        (rows.get(id) as Picking).batchId = null;
      });
      log.push(`clear ${ids.join(',')}`);
    },
    unpickEmptyMoves: async (ids) => {
      log.push(`unpick ${ids.join(',')}`);
    },
    findAutoBatch: async (pickingId, { batchesToValidate }) => {
      if (failAutoBatch) {
        throw new Error('This record is being processed. Try again in a moment.');
      }
      const row = rows.get(pickingId) as Picking;
      const open = [...batchStates].find(([id, state]) => state === 'IN_PROGRESS' && !batchesToValidate?.includes(id));

      row.batchId = open?.[0] ?? `auto-${pickingId}`;
      if (open === undefined) {
        batchStates.set(row.batchId, 'IN_PROGRESS');
      }
      log.push(`auto batch ${pickingId}`);
    },
    autoWave: async () => {},
    recomputeBatchState: async (batchIds) => {
      for (const batchId of batchIds) {
        const states = [...rows.values()].filter((row) => row.batchId === batchId).map((row) => row.state);

        if (states.length > 0 && states.every((state) => state === 'DONE')) {
          batchStates.set(batchId, 'DONE');
        }
      }
      log.push(`recompute ${batchIds.join(',')}`);
    },
  });

  return {
    afterValidateBatch,
    rows,
    batchStates,
    log,
    failAutoBatch: () => {
      failAutoBatch = true;
    },
  };
};

describe('afterValidateBatch', () => {
  it('a backorder never joins the batch whose transfers were all just validated with "Create Backorder"', async () => {
    const run = world(
      [
        { id: 'p1', state: 'DONE', batchId: 'b1', backorderId: null },
        { id: 'p2', state: 'DONE', batchId: 'b1', backorderId: null },
        { id: 'p1-back', state: 'ASSIGNED', batchId: null, backorderId: 'p1' },
        { id: 'p2-back', state: 'ASSIGNED', batchId: null, backorderId: 'p2' },
      ],
      { b1: 'IN_PROGRESS' },
    );

    await run.afterValidateBatch({ pickingIds: ['p1', 'p2'], batchesToValidate: [], pickingsToDetach: [] });

    expect(run.batchStates.get('b1')).toBe('DONE');
    expect([run.rows.get('p1-back')?.batchId, run.rows.get('p2-back')?.batchId]).toEqual(['auto-p1-back', 'auto-p1-back']);
    expect(run.rows.get('p1')?.batchId).toBe('b1');
  });

  it('still detaches, leaves and recomputes when looking for a batch fails, and reports the failure after', async () => {
    const run = world(
      [
        { id: 'p1', state: 'ASSIGNED', batchId: 'b1', backorderId: null },
        { id: 'p2', state: 'DONE', batchId: 'b1', backorderId: null },
      ],
      { b1: 'IN_PROGRESS' },
    );
    run.failAutoBatch();

    await expect(run.afterValidateBatch({ pickingIds: ['p2'], batchesToValidate: ['b1'], pickingsToDetach: ['p1'] })).rejects.toThrow(
      'This record is being processed.',
    );
    expect(run.rows.get('p1')?.batchId).toBe(null);
    expect(run.batchStates.get('b1')).toBe('DONE');
    expect(run.log).toEqual(['clear p1', 'unpick p1', 'recompute b1', 'recompute b1']);
  });
});
