import { describe, expect, it } from 'vitest';

import { planActionDone } from 'src/stock/utils/plan-action-done.util';
import { type ActionDoneMove } from 'src/stock/utils/types/action-done-move.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

const UOMS = new Map<string, ResolvedUom>([['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }]]);

const move = (overrides: Partial<ActionDoneMove> = {}): ActionDoneMove => ({
  id: 'a',
  state: 'ASSIGNED',
  picked: true,
  productUomQty: 2,
  isInventory: false,
  productUomId: 'unit',
  lines: [{ id: 'la', quantity: 2, productUomId: 'unit', picked: true }],
  ...overrides,
});

describe('planActionDone', () => {
  it('does a fully picked move and splits nothing', () => {
    expect(planActionDone({ moves: [move()], cancelBackorder: false, uoms: UOMS, digits: 2 })).toEqual({
      cancelMoveIds: [],
      destroyLineIds: [],
      todoMoveIds: ['a'],
      commitLineIds: ['la'],
      splitMoveIds: [],
    });
  });

  it('marks the move done with 1 of 2 as short, for a split', () => {
    expect(
      planActionDone({
        moves: [move({ lines: [{ id: 'la', quantity: 1, productUomId: 'unit', picked: true }] })],
        cancelBackorder: false,
        uoms: UOMS,
        digits: 2,
      }).splitMoveIds,
    ).toEqual(['a']);
  });

  it('leaves an unpicked move with demand for the backorder', () => {
    const plan = planActionDone({
      moves: [move(), move({ id: 'b', picked: false, lines: [] })],
      cancelBackorder: false,
      uoms: UOMS,
      digits: 2,
    });

    expect({ cancel: plan.cancelMoveIds, todo: plan.todoMoveIds }).toEqual({ cancel: [], todo: ['a'] });
  });

  it('cancels the unpicked move when there is no backorder', () => {
    const plan = planActionDone({
      moves: [move(), move({ id: 'b', picked: false, lines: [] })],
      cancelBackorder: true,
      uoms: UOMS,
      digits: 2,
    });

    expect({ cancel: plan.cancelMoveIds, todo: plan.todoMoveIds, splitMoveIds: plan.splitMoveIds }).toEqual({
      cancel: ['b'],
      todo: ['a'],
      splitMoveIds: [],
    });
  });

  it('cancels an unpicked move with demand 0 even with a backorder', () => {
    expect(
      planActionDone({ moves: [move({ id: 'c', productUomQty: 0, picked: false, lines: [] })], cancelBackorder: false, uoms: UOMS, digits: 2 })
        .cancelMoveIds,
    ).toEqual(['c']);
  });

  it('drops the unpicked lines of a picked move and destroys its zero lines', () => {
    expect(
      planActionDone({
        moves: [
          move({
            lines: [
              { id: 'la', quantity: 2, productUomId: 'unit', picked: true },
              { id: 'lb', quantity: 1, productUomId: 'unit', picked: false },
              { id: 'lc', quantity: 0, productUomId: 'unit', picked: true },
            ],
          }),
        ],
        cancelBackorder: false,
        uoms: UOMS,
        digits: 2,
      }),
    ).toEqual({ cancelMoveIds: [], destroyLineIds: ['lb', 'lc'], todoMoveIds: ['a'], commitLineIds: ['la'], splitMoveIds: [] });
  });

  it('keeps an inventory line with quantity 0', () => {
    expect(
      planActionDone({
        moves: [move({ isInventory: true, lines: [{ id: 'li', quantity: 0, productUomId: 'unit', picked: true }] })],
        cancelBackorder: true,
        uoms: UOMS,
        digits: 2,
      }).commitLineIds,
    ).toEqual(['li']);
  });

  it('skips done and cancelled moves', () => {
    expect(planActionDone({ moves: [move({ state: 'DONE' }), move({ id: 'x', state: 'CANCEL' })], cancelBackorder: false, uoms: UOMS, digits: 2 }).todoMoveIds).toEqual([]);
  });
});
