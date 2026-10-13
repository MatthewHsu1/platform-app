import { describe, expect, it } from 'vitest';

import {
  LOT_NAME_MISSING_REASON,
  LOT_PRODUCT_CHANGE_REFUSED,
  lotProductChangeRefusal,
  planLotName,
} from 'src/stock/utils/plan-lot-rules.util';

describe('planLotName', () => {
  it('keeps a typed name', () => {
    expect(planLotName({ name: 'LOT-7', lotSequenceId: 'seq' })).toEqual({ kind: 'keep' });
  });

  it('numbers an unnamed lot from its product sequence', () => {
    expect(planLotName({ name: null, lotSequenceId: 'seq' })).toEqual({ kind: 'number', sequenceId: 'seq' });
    expect(planLotName({ name: '', lotSequenceId: 'seq' })).toEqual({ kind: 'number', sequenceId: 'seq' });
  });

  it('refuses an unnamed lot whose product has no sequence', () => {
    expect(planLotName({ name: null, lotSequenceId: null })).toEqual({ kind: 'refuse', reason: LOT_NAME_MISSING_REASON });
  });
});

describe('lotProductChangeRefusal', () => {
  it('refuses a new product while lines of another product use the lot', () => {
    expect(
      lotProductChangeRefusal({ beforeProductId: 'a', afterProductId: 'b', moveLineProductIds: ['a'] }),
    ).toBe(LOT_PRODUCT_CHANGE_REFUSED);
  });

  it('allows it when no line uses the lot, or every line already has the new product', () => {
    expect(lotProductChangeRefusal({ beforeProductId: 'a', afterProductId: 'b', moveLineProductIds: [] })).toBeNull();
    expect(lotProductChangeRefusal({ beforeProductId: 'a', afterProductId: 'b', moveLineProductIds: ['b'] })).toBeNull();
  });

  it('allows it when the product did not change, whatever lines use the lot', () => {
    expect(lotProductChangeRefusal({ beforeProductId: 'a', afterProductId: 'a', moveLineProductIds: ['b'] })).toBeNull();
  });
});
