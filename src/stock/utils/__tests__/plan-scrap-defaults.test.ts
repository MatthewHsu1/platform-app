import { describe, expect, it } from 'vitest';

import { NO_WAREHOUSE_REASON, planScrapDefaults } from 'src/stock/utils/plan-scrap-defaults.util';

const scrap = (overrides: Record<string, unknown> = {}) => ({
  productId: 'p', productUomId: null, locationId: null, scrapLocationId: null, state: 'DRAFT' as const, ...overrides,
});
const base = {
  operation: 'created' as const,
  productChanged: false,
  pickingChanged: false,
  productUomId: 'unit',
  picking: null,
  firstWarehouseLotStockId: 'wh-stock',
  oldestInventoryLocationId: 'inventory-adjustment',
};

describe('planScrapDefaults', () => {
  it('fills the unit, the first warehouse stock and the oldest inventory location on a new scrap', () => {
    expect(planScrapDefaults({ ...base, scrap: scrap() })).toEqual({
      kind: 'write',
      data: { productUomId: 'unit', locationId: 'wh-stock', scrapLocationId: 'inventory-adjustment' },
    });
  });

  it('takes the destination of a done transfer and the source of an open one', () => {
    const done = { state: 'DONE' as const, locationId: 'stock', locationDestId: 'customers' };

    expect(planScrapDefaults({ ...base, scrap: scrap(), picking: done })).toMatchObject({ data: { locationId: 'customers' } });
    expect(planScrapDefaults({ ...base, scrap: scrap(), picking: { ...done, state: 'ASSIGNED' as const } })).toMatchObject({
      data: { locationId: 'stock' },
    });
  });

  it('keeps what the user typed on create', () => {
    expect(
      planScrapDefaults({
        ...base,
        scrap: scrap({ productUomId: 'dozen', locationId: 'shelf', scrapLocationId: 'scrap' }),
      }),
    ).toEqual({ kind: 'write', data: {} });
  });

  it('follows a new transfer and a new product', () => {
    expect(
      planScrapDefaults({
        ...base,
        operation: 'updated',
        pickingChanged: true,
        productChanged: true,
        scrap: scrap({ productUomId: 'dozen', locationId: 'shelf', scrapLocationId: 'scrap' }),
        picking: { state: 'ASSIGNED' as const, locationId: 'stock', locationDestId: 'customers' },
      }),
    ).toEqual({ kind: 'write', data: { productUomId: 'unit', locationId: 'stock' } });
  });

  it('refuses a scrap with no transfer when there is no warehouse', () => {
    expect(planScrapDefaults({ ...base, firstWarehouseLotStockId: null, scrap: scrap() })).toEqual({
      kind: 'refuse',
      reason: NO_WAREHOUSE_REASON,
    });
  });

  it('leaves a done scrap alone', () => {
    expect(planScrapDefaults({ ...base, scrap: scrap({ state: 'DONE' as const }) })).toEqual({ kind: 'write', data: {} });
  });
});
