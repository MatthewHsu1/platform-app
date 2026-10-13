import { describe, expect, it } from 'vitest';

import { planQtyToOrderInverse } from 'src/stock/orderpoint/utils/plan-qty-to-order-inverse.util';

describe('planQtyToOrderInverse', () => {
  it('an automatic rule keeps the computed quantity', () => {
    expect(planQtyToOrderInverse({ trigger: 'AUTO', qtyToOrderManual: 0, typed: 8, computed: 5 })).toEqual({ qtyToOrderManual: 0, qtyToOrder: 5 });
  });

  it('a manual rule cleared to 0 with no typed quantity goes back to the computed one', () => {
    expect(planQtyToOrderInverse({ trigger: 'MANUAL', qtyToOrderManual: 0, typed: 0, computed: 5 })).toEqual({ qtyToOrderManual: 0, qtyToOrder: 5 });
  });

  it('a manual rule stores a typed quantity that differs from the computed one', () => {
    expect(planQtyToOrderInverse({ trigger: 'MANUAL', qtyToOrderManual: 0, typed: 8, computed: 5 })).toEqual({ qtyToOrderManual: 8, qtyToOrder: 8 });
  });

  it('typing the computed value over a typed one keeps the typed one', () => {
    expect(planQtyToOrderInverse({ trigger: 'MANUAL', qtyToOrderManual: 7, typed: 5, computed: 5 })).toEqual({ qtyToOrderManual: 7, qtyToOrder: 7 });
  });
});
