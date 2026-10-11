import { describe, expect, it } from 'vitest';

import { groupLotMoves, planLotRelocationRuns } from 'src/stock/utils/plan-lot-relocation-batch.util';

const edit = (lotId: string, toLocationId = 'shelf') => ({ lotId, toLocationId });

describe('planLotRelocationRuns', () => {
  it('fills each run with lots in their edit order up to the stock rows a run may move', () => {
    const runs = planLotRelocationRuns({
      edits: [edit('a'), edit('b'), edit('c'), edit('d')],
      quantCounts: new Map([
        ['a', 2],
        ['b', 2],
        ['c', 1],
        ['d', 3],
      ]),
      maxQuants: 5,
    });

    expect(runs.map((run) => run.map((entry) => entry.lotId))).toEqual([['a', 'b', 'c'], ['d']]);
  });

  it('runs a lot with more rows than a run may move on its own, and counts a lot without stock as one', () => {
    const runs = planLotRelocationRuns({
      edits: [edit('small'), edit('big'), edit('empty1'), edit('empty2'), edit('empty3')],
      quantCounts: new Map([
        ['small', 1],
        ['big', 9],
      ]),
      maxQuants: 2,
    });

    expect(runs.map((run) => run.map((entry) => entry.lotId))).toEqual([['small'], ['big'], ['empty1', 'empty2'], ['empty3']]);
  });

  it('puts a second edit of the same lot in a later run, so the edits apply in the order they were made', () => {
    const runs = planLotRelocationRuns({
      edits: [edit('a', 'B'), edit('b'), edit('a', 'C')],
      quantCounts: new Map(),
      maxQuants: 10,
    });

    expect(runs).toEqual([[edit('a', 'B'), edit('b')], [edit('a', 'C')]]);
  });
});

describe('groupLotMoves', () => {
  it('moves the rows of all lots headed to one place in one move, apart from lots that leave their package', () => {
    expect(
      groupLotMoves([
        { lotId: 'a', quantIds: ['qa'], unpack: false, toLocationId: 'shelf' },
        { lotId: 'b', quantIds: ['qb1', 'qb2'], unpack: false, toLocationId: 'other' },
        { lotId: 'c', quantIds: ['qc'], unpack: false, toLocationId: 'shelf' },
        { lotId: 'd', quantIds: ['qd'], unpack: true, toLocationId: 'shelf' },
        { lotId: 'e', quantIds: ['qe'], unpack: false, toLocationId: null },
      ]),
    ).toEqual([
      { toLocationId: 'shelf', unpack: false, quantIds: ['qa', 'qc'] },
      { toLocationId: 'other', unpack: false, quantIds: ['qb1', 'qb2'] },
      { toLocationId: 'shelf', unpack: true, quantIds: ['qd'] },
      { toLocationId: null, unpack: false, quantIds: ['qe'] },
    ]);
  });
});
