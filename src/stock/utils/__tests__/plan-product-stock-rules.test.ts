import { describe, expect, it } from 'vitest';

import {
  planProductUomChange,
  planStorableFlag,
  planUomRatioChange,
} from 'src/stock/utils/plan-product-stock-rules.util';

describe('planStorableFlag', () => {
  it('turns tracking off when the product is no longer goods', () => {
    expect(planStorableFlag({ productType: 'SERVICE', isStorable: true })).toEqual({ isStorable: false });
    expect(planStorableFlag({ productType: 'COMBO', isStorable: true })).toEqual({ isStorable: false });
  });

  it('leaves goods and untracked products alone', () => {
    expect(planStorableFlag({ productType: 'CONSU', isStorable: true })).toBeNull();
    expect(planStorableFlag({ productType: 'SERVICE', isStorable: false })).toBeNull();
  });
});

describe('planProductUomChange', () => {
  it('moves every move and line to the new unit when all used the old one', () => {
    expect(
      planProductUomChange({
        oldUomId: 'unit',
        newUomId: 'kg',
        moves: [{ id: 'm1', productUomId: 'unit' }],
        lines: [{ id: 'l1', productUomId: 'unit' }, { id: 'l2', productUomId: 'unit' }],
      }),
    ).toEqual({ kind: 'rewrite', moveIds: ['m1'], lineIds: ['l1', 'l2'] });
  });

  it('refuses when a move or a line used another unit, and names it', () => {
    expect(
      planProductUomChange({
        oldUomId: 'unit',
        newUomId: 'kg',
        moves: [{ id: 'm1', productUomId: 'unit' }, { id: 'm2', productUomId: 'dozen' }],
        lines: [],
      }),
    ).toEqual({ kind: 'refuse', problemUomId: 'dozen' });
    expect(
      planProductUomChange({ oldUomId: 'unit', newUomId: 'kg', moves: [], lines: [{ id: 'l1', productUomId: 'dozen' }] }),
    ).toEqual({ kind: 'refuse', problemUomId: 'dozen' });
  });

  it('has nothing to rewrite for a product never moved', () => {
    expect(planProductUomChange({ oldUomId: 'unit', newUomId: 'kg', moves: [], lines: [] })).toEqual({
      kind: 'rewrite',
      moveIds: [],
      lineIds: [],
    });
  });
});

describe('planUomRatioChange', () => {
  const before = { relativeFactor: 12, relativeUomId: 'unit' };

  it('puts the ratio back while an open move, an open line or stock uses the unit', () => {
    const changed = { relativeFactor: 10, relativeUomId: 'unit' };

    expect(planUomRatioChange({ before, after: changed, openMoves: 1, openLines: 0, heldQuants: 0 })).toEqual(before);
    expect(planUomRatioChange({ before, after: changed, openMoves: 0, openLines: 2, heldQuants: 0 })).toEqual(before);
    expect(planUomRatioChange({ before, after: changed, openMoves: 0, openLines: 0, heldQuants: 1 })).toEqual(before);
  });

  it('puts a new reference unit back too', () => {
    expect(
      planUomRatioChange({ before, after: { relativeFactor: 12, relativeUomId: 'pack' }, openMoves: 1, openLines: 0, heldQuants: 0 }),
    ).toEqual(before);
  });

  it('allows the change when nothing uses the unit, and ignores edits that keep the ratio', () => {
    expect(planUomRatioChange({ before, after: { relativeFactor: 10, relativeUomId: 'unit' }, openMoves: 0, openLines: 0, heldQuants: 0 })).toBeNull();
    expect(planUomRatioChange({ before, after: before, openMoves: 3, openLines: 3, heldQuants: 3 })).toBeNull();
  });
});
