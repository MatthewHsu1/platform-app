import { describe, expect, it } from 'vitest';

import { matchesPushFilter } from 'src/stock/rule/push-filter';
import { type PushFilterRecord } from 'src/stock/rule/types/push-filter-record.type';

const move: PushFilterRecord = {
  productUomQty: 12,
  quantity: 12,
  origin: 'SO042',
  priority: 'URGENT',
  date: '2026-10-10T12:00:00.000Z',
  product: { name: 'Belt', defaultCode: 'BELT-1', barcode: null },
  category: { name: 'Belts', completeName: 'Goods / Belts' },
  picking: { name: 'WH/PICK/00007', origin: 'SO042', priority: 'URGENT', pickingTypeCode: 'INTERNAL' },
};

describe('matchesPushFilter', () => {
  it('reads the move and one hop through its product, category and transfer', () => {
    const query = {
      combinator: 'and',
      rules: [
        { field: 'category.name', operator: '=', value: 'Belts' },
        { field: 'picking.pickingTypeCode', operator: 'in', value: 'INTERNAL,OUTGOING' },
        { field: 'productUomQty', operator: '>=', value: '10' },
      ],
    };

    expect(matchesPushFilter(query, move)).toBe(true);
    expect(matchesPushFilter(query, { ...move, category: null })).toBe(false);
  });
});
