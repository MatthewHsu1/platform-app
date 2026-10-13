import { describe, expect, it } from 'vitest';

import { type BatchValidatePicking } from 'src/stock-picking-batch/types/batch-validate-picking.type';
import {
  pickingsLeavingBeforeBackorder,
  planAfterValidateBatch,
  planBatchValidate,
} from 'src/stock-picking-batch/utils/plan-batch-validate.util';

const move = (quantity: number, picked: boolean, state = 'ASSIGNED') => ({ state, picked, quantity });
const picking = (id: string, state: string, moves: BatchValidatePicking['moves'], lineCount = moves.length): BatchValidatePicking => ({
  id,
  state,
  moves,
  lineCount,
});

describe('planBatchValidate', () => {
  it('detaches a reserved but unpicked transfer when another one has picked quantities', () => {
    expect(
      planBatchValidate({ pickings: [picking('p1', 'ASSIGNED', [move(1, false)]), picking('p2', 'ASSIGNED', [move(1, true)])], digits: 2 }),
    ).toEqual({ withoutMoves: null, toValidateIds: ['p2'], pickingsToDetach: ['p1'], emptyWaitingIds: [] });
  });

  it('detaches a ready transfer with nothing left and validates the other one, even unpicked', () => {
    expect(
      planBatchValidate({
        pickings: [picking('r1', 'ASSIGNED', [move(4, false), move(0, false)]), picking('r2', 'ASSIGNED', [move(0, false), move(0, false)])],
        digits: 2,
      }),
    ).toEqual({ withoutMoves: null, toValidateIds: ['r1'], pickingsToDetach: ['r2'], emptyWaitingIds: ['r2'] });
  });

  it('detaches a ready transfer whose quantity was set to zero and validates the unpicked one with a quantity', () => {
    expect(
      planBatchValidate({ pickings: [picking('p1', 'ASSIGNED', [move(0, false)]), picking('p2', 'ASSIGNED', [move(3, false)])], digits: 2 }),
    ).toEqual({ withoutMoves: null, toValidateIds: ['p2'], pickingsToDetach: ['p1'], emptyWaitingIds: ['p1'] });
  });

  it('detaches a waiting transfer with nothing picked', () => {
    expect(
      planBatchValidate({
        pickings: [picking('w1', 'CONFIRMED', [move(0, false, 'CONFIRMED')]), picking('p2', 'ASSIGNED', [move(3, true)])],
        digits: 2,
      }),
    ).toEqual({ withoutMoves: null, toValidateIds: ['p2'], pickingsToDetach: ['w1'], emptyWaitingIds: ['w1'] });
  });

  it('names a draft transfer with no moves next to a picked one, unlisted when the two are the whole batch', () => {
    expect(
      planBatchValidate({ pickings: [picking('draft', 'DRAFT', []), picking('p2', 'ASSIGNED', [move(3, true)])], digits: 2 }).withoutMoves,
    ).toEqual({ ids: ['draft'], listed: false });
  });

  it('lists the transfers with nothing to move when the batch also holds transfers left out of the run', () => {
    expect(
      planBatchValidate({
        pickings: [picking('draft', 'DRAFT', []), picking('p2', 'ASSIGNED', [move(3, true)]), picking('w1', 'CONFIRMED', [move(0, false, 'CONFIRMED')])],
        digits: 2,
      }).withoutMoves,
    ).toEqual({ ids: ['draft'], listed: true });
  });

  it('does not list a lone draft with no moves, even when the batch also holds transfers left out of the run', () => {
    expect(
      planBatchValidate({ pickings: [picking('draft', 'DRAFT', []), picking('w1', 'CONFIRMED', [move(0, false, 'CONFIRMED')])], digits: 2 })
        .withoutMoves,
    ).toEqual({ ids: ['draft'], listed: false });
  });

  it('counts a transfer with detailed lines but no moves as one with something to move', () => {
    expect(
      planBatchValidate({ pickings: [picking('lines', 'DRAFT', [], 2), picking('p2', 'ASSIGNED', [move(3, true)])], digits: 2 }).withoutMoves,
    ).toBeNull();
  });

  it('validates every transfer when all are picked', () => {
    expect(
      planBatchValidate({ pickings: [picking('p1', 'ASSIGNED', [move(10, true)]), picking('p2', 'ASSIGNED', [move(7, true)])], digits: 2 }),
    ).toEqual({ withoutMoves: null, toValidateIds: ['p1', 'p2'], pickingsToDetach: [], emptyWaitingIds: [] });
  });

  it('ignores done and cancelled transfers and the closed moves of a transfer', () => {
    expect(
      planBatchValidate({
        pickings: [picking('d', 'DONE', [move(1, true, 'DONE')]), picking('p', 'ASSIGNED', [move(2, true), move(5, false, 'CANCEL')])],
        digits: 2,
      }).toValidateIds,
    ).toEqual(['p']);
  });

  it('reads a quantity below the unit precision as zero', () => {
    expect(
      planBatchValidate({ pickings: [picking('p1', 'ASSIGNED', [move(0.001, true)]), picking('p2', 'ASSIGNED', [move(2, true)])], digits: 2 }),
    ).toEqual({ withoutMoves: null, toValidateIds: ['p2'], pickingsToDetach: ['p1'], emptyWaitingIds: ['p1'] });
  });
});

describe('planAfterValidateBatch', () => {
  const members = (batchId: string, states: [string, string][]) =>
    new Map([[batchId, states.map(([id, state]) => ({ id, state }))]]);

  it('stops when no transfer ended done, as when the backorder question is still open', () => {
    expect(
      planAfterValidateBatch({
        validated: [{ id: 'p1', state: 'ASSIGNED', batchId: 'b1', backorderIds: [] }],
        detached: [{ id: 'p2', batchId: 'b1' }],
        batchesToValidate: ['b1'],
        batchMemberStates: new Map(),
      }).stop,
    ).toBe(true);
  });

  it('detaches, keeps a done transfer whose batch is all done, and looks for a batch for detached transfers and backorders', () => {
    expect(
      planAfterValidateBatch({
        validated: [{ id: 'p2', state: 'DONE', batchId: 'b1', backorderIds: ['p2-back'] }],
        detached: [{ id: 'p1', batchId: 'b1' }],
        batchesToValidate: ['b1'],
        batchMemberStates: members('b1', [
          ['p1', 'ASSIGNED'],
          ['p2', 'DONE'],
        ]),
      }),
    ).toEqual({ stop: false, detachIds: ['p1'], unpickIds: ['p1'], leaveIds: [], rebatchIds: ['p1', 'p2-back'] });
  });

  it('a rerun after the detached transfer joined another batch leaves it there', () => {
    expect(
      planAfterValidateBatch({
        validated: [{ id: 'p2', state: 'DONE', batchId: 'b1', backorderIds: [] }],
        detached: [{ id: 'p1', batchId: 'b2' }],
        batchesToValidate: ['b1'],
        batchMemberStates: members('b1', [['p2', 'DONE']]),
      }),
    ).toEqual({ stop: false, detachIds: [], unpickIds: [], leaveIds: [], rebatchIds: [] });
  });

  it('a rerun after the detach was written still unpicks the transfer and looks for its batch', () => {
    expect(
      planAfterValidateBatch({
        validated: [{ id: 'p2', state: 'DONE', batchId: 'b1', backorderIds: [] }],
        detached: [{ id: 'p1', batchId: null }],
        batchesToValidate: ['b1'],
        batchMemberStates: members('b1', [['p2', 'DONE']]),
      }),
    ).toEqual({ stop: false, detachIds: [], unpickIds: ['p1'], leaveIds: [], rebatchIds: ['p1'] });
  });

  it('keeps both transfers of a batch in it when one click validates both, one with a backorder answer and one without', () => {
    expect(
      planAfterValidateBatch({
        validated: [
          { id: 'p1', state: 'DONE', batchId: 'b1', backorderIds: [] },
          { id: 'p2', state: 'DONE', batchId: 'b1', backorderIds: [] },
        ],
        detached: [],
        batchesToValidate: [],
        batchMemberStates: members('b1', [
          ['p1', 'DONE'],
          ['p2', 'DONE'],
        ]),
      }),
    ).toEqual({ stop: false, detachIds: [], unpickIds: [], leaveIds: [], rebatchIds: [] });
  });

  it('a transfer validated on its own leaves a batch whose other transfer is not done', () => {
    expect(
      planAfterValidateBatch({
        validated: [{ id: 'out1', state: 'DONE', batchId: 'b1', backorderIds: [] }],
        detached: [],
        batchesToValidate: [],
        batchMemberStates: members('b1', [
          ['out1', 'DONE'],
          ['out3', 'ASSIGNED'],
        ]),
      }).leaveIds,
    ).toEqual(['out1']);
  });
});

describe('pickingsLeavingBeforeBackorder', () => {
  const batchMembers = new Map([['b1', ['p1', 'p2']]]);

  it('a transfer not done leaves a batch it shares with transfers outside this validation', () => {
    expect(
      pickingsLeavingBeforeBackorder({ pickings: [{ id: 'p1', state: 'ASSIGNED', batchId: 'b1' }], validatingIds: ['p1'], pickingsToDetach: [], batchMembers }),
    ).toEqual(['p1']);
  });

  it('stays when every other member is in this validation or detached, and when it is done', () => {
    expect(
      pickingsLeavingBeforeBackorder({
        pickings: [{ id: 'p1', state: 'ASSIGNED', batchId: 'b1' }],
        validatingIds: ['p1', 'p2'],
        pickingsToDetach: [],
        batchMembers,
      }),
    ).toEqual([]);
    expect(
      pickingsLeavingBeforeBackorder({ pickings: [{ id: 'p1', state: 'ASSIGNED', batchId: 'b1' }], validatingIds: ['p1'], pickingsToDetach: ['p2'], batchMembers }),
    ).toEqual([]);
    expect(
      pickingsLeavingBeforeBackorder({ pickings: [{ id: 'p1', state: 'DONE', batchId: 'b1' }], validatingIds: ['p1'], pickingsToDetach: [], batchMembers }),
    ).toEqual([]);
  });

  it('a transfer in no batch has nothing to leave', () => {
    expect(
      pickingsLeavingBeforeBackorder({ pickings: [{ id: 'p3', state: 'ASSIGNED', batchId: null }], validatingIds: ['p3'], pickingsToDetach: [], batchMembers }),
    ).toEqual([]);
  });
});
