import { describe, expect, it } from 'vitest';

import { type PickingForCheck } from 'src/stock-picking-batch/types/picking-for-check.type';
import {
  isEditOfValidatingBatch,
  pickingsLeavingOnCancel,
  planBatchMembership as planWithPickings,
} from 'src/stock-picking-batch/utils/plan-batch-membership.util';

const picking = (id: string, state: string, pickingTypeId: string | null = 'out'): PickingForCheck => ({
  id,
  name: `WH/${id}`,
  state,
  pickingTypeId,
});

const batch = (
  id: string,
  state: 'DRAFT' | 'IN_PROGRESS' | 'DONE' | 'CANCEL',
  members: PickingForCheck[],
  pickingTypeId: string | null = 'out',
) => ({ id, name: `BATCH/OUT/${id}`, state, pickingTypeId, members });

// The moved transfers are read where they are now: in the batch that holds them.
const planBatchMembership = (input: Omit<Parameters<typeof planWithPickings>[0], 'pickings'>) =>
  planWithPickings({
    ...input,
    pickings: input.batches.flatMap((holder) => holder.members.map((member) => ({ ...member, batchId: holder.id }))),
  });

const staffJoin = (pickingId: string, batchId: string | null, previousBatchId: string | null = null) => ({
  pickingId,
  batchId,
  previousBatchId,
  checked: true,
});

describe('planBatchMembership', () => {
  it('puts back a transfer of another operation type and names the batch and the transfer', () => {
    const plan = planBatchMembership({
      changes: [staffJoin('p1', 'b1')],
      batches: [batch('b1', 'IN_PROGRESS', [picking('p1', 'ASSIGNED', 'in')])],
    });

    expect(plan.refusals).toEqual([
      { pickingId: 'p1', previousBatchId: null, batchName: 'BATCH/OUT/b1', transfers: ['WH/p1'] },
    ]);
    expect(plan.accepted).toEqual([]);
  });

  it('puts a refused transfer back into the batch it came from', () => {
    const plan = planBatchMembership({
      changes: [staffJoin('p1', 'b1', 'b0')],
      batches: [batch('b1', 'IN_PROGRESS', [picking('p1', 'DRAFT')]), batch('b0', 'DRAFT', [])],
    });

    expect(plan.refusals.map((refusal) => refusal.previousBatchId)).toEqual(['b0']);
  });

  it('refuses a transfer joining a batch that holds a transfer it may not hold', () => {
    const plan = planBatchMembership({
      changes: [staffJoin('p2', 'b1')],
      batches: [batch('b1', 'DONE', [picking('p1', 'DONE'), picking('p2', 'ASSIGNED')])],
    });

    expect(plan.refusals).toEqual([
      { pickingId: 'p2', previousBatchId: null, batchName: 'BATCH/OUT/b1', transfers: ['WH/p1'] },
    ]);
  });

  it('gives a batch without a type the type of its first transfer', () => {
    const plan = planBatchMembership({
      changes: [staffJoin('p1', 'b1')],
      batches: [batch('b1', 'DRAFT', [picking('p1', 'ASSIGNED', 'out')], null)],
    });

    expect(plan.setTypes).toEqual([{ batchId: 'b1', pickingTypeId: 'out' }]);
    expect(plan.accepted).toEqual([{ pickingId: 'p1', batchId: 'b1', putBack: false }]);
  });

  it('refuses a second transfer of another type once the first one has typed the batch', () => {
    const plan = planBatchMembership({
      changes: [staffJoin('p1', 'b1'), staffJoin('p2', 'b1')],
      batches: [batch('b1', 'DRAFT', [picking('p1', 'ASSIGNED', 'out'), picking('p2', 'ASSIGNED', 'in')], null)],
    });

    expect(plan.setTypes).toEqual([{ batchId: 'b1', pickingTypeId: 'out' }]);
    expect(plan.refusals.map((refusal) => refusal.pickingId)).toEqual(['p2']);
  });

  it('does not check the app writing a batch on its transfers', () => {
    const plan = planBatchMembership({
      changes: [{ ...staffJoin('p1', 'b1'), checked: false }],
      batches: [batch('b1', 'IN_PROGRESS', [picking('p1', 'DRAFT')])],
    });

    expect(plan.refusals).toEqual([]);
    expect(plan.accepted).toEqual([{ pickingId: 'p1', batchId: 'b1', putBack: false }]);
  });

  it('checks the transfers of an untyped batch the app types, and refuses a transfer that does not fit', () => {
    const plan = planBatchMembership({
      changes: [{ ...staffJoin('p2', 'b1'), checked: false }],
      batches: [batch('b1', 'DRAFT', [picking('p1', 'ASSIGNED', 'in'), picking('p2', 'ASSIGNED', 'out')], null)],
    });

    expect(plan.setTypes).toEqual([]);
    expect(plan.refusals).toEqual([
      { pickingId: 'p2', previousBatchId: null, batchName: 'BATCH/OUT/b1', transfers: ['WH/p1'] },
    ]);
  });

  it('leaves a save the transfer has moved on from to the later save', () => {
    const plan = planBatchMembership({
      changes: [staffJoin('p1', 'b1')],
      batches: [batch('b1', 'IN_PROGRESS', [])],
    });

    expect(plan.refusals).toEqual([]);
    expect(plan.accepted).toEqual([]);
  });

  it('cancels a batch in progress when its last transfer is removed', () => {
    const plan = planBatchMembership({
      changes: [staffJoin('p1', null, 'b0')],
      batches: [batch('b0', 'IN_PROGRESS', [])],
    });

    expect(plan.cancelBatchIds).toEqual(['b0']);
  });

  it('keeps a draft batch when its last transfer is removed', () => {
    const plan = planBatchMembership({
      changes: [staffJoin('p1', null, 'b0')],
      batches: [batch('b0', 'DRAFT', [])],
    });

    expect(plan.cancelBatchIds).toEqual([]);
  });

  it('cancels a draft batch whose last transfer moved to another batch, but not a done one', () => {
    const fromDraft = planBatchMembership({
      changes: [staffJoin('p1', 'b1', 'b0')],
      batches: [batch('b1', 'DRAFT', [picking('p1', 'ASSIGNED')]), batch('b0', 'DRAFT', [])],
    });
    const fromDone = planBatchMembership({
      changes: [staffJoin('p1', 'b1', 'b0')],
      batches: [batch('b1', 'DRAFT', [picking('p1', 'ASSIGNED')]), batch('b0', 'DONE', [])],
    });

    expect(fromDraft.cancelBatchIds).toEqual(['b0']);
    expect(fromDone.cancelBatchIds).toEqual([]);
  });

  it('cancels a draft batch the app empties by moving its last transfer to another batch', () => {
    const plan = planBatchMembership({
      changes: [{ ...staffJoin('p1', 'b1', 'b0'), checked: false }],
      batches: [batch('b1', 'DRAFT', [picking('p1', 'ASSIGNED')]), batch('b0', 'DRAFT', [])],
    });

    expect(plan.cancelBatchIds).toEqual(['b0']);
  });

  it('a refused transfer put back does not cancel the batch that refused it, nor take the responsible again', () => {
    const plan = planBatchMembership({
      changes: [{ ...staffJoin('p1', 'b0', 'b1'), checked: false }],
      batches: [batch('b0', 'IN_PROGRESS', [picking('p1', 'ASSIGNED', 'in')], 'in'), batch('b1', 'IN_PROGRESS', [])],
    });

    expect(plan.cancelBatchIds).toEqual([]);
    expect(plan.accepted).toEqual([{ pickingId: 'p1', batchId: 'b0', putBack: true }]);
  });

  it('keeps a batch that still has a transfer, or gets its refused transfer back', () => {
    const stillHasOne = planBatchMembership({
      changes: [staffJoin('p1', null, 'b0')],
      batches: [batch('b0', 'IN_PROGRESS', [picking('p2', 'ASSIGNED')])],
    });
    const refusedBack = planBatchMembership({
      changes: [staffJoin('p1', 'b1', 'b0')],
      batches: [batch('b1', 'IN_PROGRESS', [picking('p1', 'ASSIGNED', 'in')]), batch('b0', 'IN_PROGRESS', [])],
    });

    expect(stillHasOne.cancelBatchIds).toEqual([]);
    expect(refusedBack.cancelBatchIds).toEqual([]);
  });

  it('touches the old and the new batch', () => {
    const plan = planBatchMembership({
      changes: [staffJoin('p1', 'b1', 'b0')],
      batches: [batch('b1', 'IN_PROGRESS', [picking('p1', 'ASSIGNED')]), batch('b0', 'IN_PROGRESS', [picking('p2', 'ASSIGNED')])],
    });

    expect([...plan.touchedBatchIds].sort()).toEqual(['b0', 'b1']);
  });
});

describe('pickingsLeavingOnCancel', () => {
  it('a cancelled transfer leaves a batch that still has live transfers, and stays in an all-cancelled one', () => {
    expect(
      pickingsLeavingOnCancel({
        cancelled: [
          { id: 'p1', batchId: 'b1' },
          { id: 'p3', batchId: 'b2' },
        ],
        batchStates: new Map([
          ['b1', ['CANCEL', 'ASSIGNED']],
          ['b2', ['CANCEL', 'CANCEL']],
        ]),
      }),
    ).toEqual(['p1']);
  });
});

describe('isEditOfValidatingBatch', () => {
  const validating = new Set(['b1']);

  it('sends back a staff edit that moves a transfer into or out of a batch being validated', () => {
    expect(isEditOfValidatingBatch({ pickingId: 't1', batchId: 'b1', previousBatchId: null, checked: true }, validating)).toBe(true);
    expect(isEditOfValidatingBatch({ pickingId: 't1', batchId: 'b2', previousBatchId: 'b1', checked: true }, validating)).toBe(true);
  });

  it('leaves staff edits between other batches, and the app moves, to the batch rules', () => {
    expect(isEditOfValidatingBatch({ pickingId: 't1', batchId: 'b2', previousBatchId: null, checked: true }, validating)).toBe(false);
    expect(isEditOfValidatingBatch({ pickingId: 't1', batchId: 'b1', previousBatchId: null, checked: false }, validating)).toBe(false);
  });
});
