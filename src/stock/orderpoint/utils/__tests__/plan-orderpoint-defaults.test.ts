import { describe, expect, it } from 'vitest';

import { type OrderpointDefaultsInput } from 'src/stock/orderpoint/types/orderpoint-defaults-input.type';
import { isMaxTypedBelowMin, planOrderpointDefaults } from 'src/stock/orderpoint/utils/plan-orderpoint-defaults.util';

// Warehouse A (first) with stock A/Stock, warehouse B with B/Stock.
const base = (
  values: Partial<Omit<OrderpointDefaultsInput, 'orderpoint' | 'saved'>> & {
    orderpoint?: Partial<OrderpointDefaultsInput['orderpoint']>;
    saved?: Partial<OrderpointDefaultsInput['saved']>;
  },
): OrderpointDefaultsInput => ({
  created: true,
  changedFields: [],
  locationWarehouseId: null,
  warehouseLotStockIds: new Map([
    ['A', 'A-stock'],
    ['B', 'B-stock'],
  ]),
  firstWarehouseId: 'A',
  productCategoryId: 'goods',
  ...values,
  orderpoint: { warehouseId: null, locationId: null, productMinQty: 0, productMaxQty: 0, productCategoryId: 'goods', ...values.orderpoint },
  // By default the row still holds what this save stored.
  saved: { warehouseId: values.orderpoint?.warehouseId ?? null, locationId: values.orderpoint?.locationId ?? null, ...values.saved },
});

describe('planOrderpointDefaults on create (warehouse and location defaults)', () => {
  it('no warehouse, no location: the first warehouse and its stock', () => {
    expect(planOrderpointDefaults(base({}))).toEqual({ kind: 'write', data: { warehouseId: 'A', locationId: 'A-stock' } });
  });

  it('a warehouse only: its stock', () => {
    expect(planOrderpointDefaults(base({ orderpoint: { warehouseId: 'B' } }))).toEqual({ kind: 'write', data: { locationId: 'B-stock' } });
  });

  it("a location only: the location's warehouse", () => {
    expect(planOrderpointDefaults(base({ orderpoint: { locationId: 'B-stock' }, locationWarehouseId: 'B' }))).toEqual({
      kind: 'write',
      data: { warehouseId: 'B' },
    });
  });

  it('a location outside every warehouse: the first warehouse', () => {
    expect(planOrderpointDefaults(base({ orderpoint: { locationId: 'transit' }, locationWarehouseId: null }))).toEqual({
      kind: 'write',
      data: { warehouseId: 'A' },
    });
  });

  it('both given: kept', () => {
    expect(planOrderpointDefaults(base({ orderpoint: { warehouseId: 'B', locationId: 'B-shelf' }, locationWarehouseId: 'B' }))).toEqual({
      kind: 'write',
      data: {},
    });
  });

  it('no warehouse anywhere: refused', () => {
    expect(planOrderpointDefaults(base({ firstWarehouseId: null }))).toEqual({ kind: 'noWarehouse' });
  });

  it('copies the product category', () => {
    expect(planOrderpointDefaults(base({ orderpoint: { warehouseId: 'B', locationId: 'B-stock', productCategoryId: null } }))).toEqual({
      kind: 'write',
      data: { productCategoryId: 'goods' },
    });
  });
});

describe('planOrderpointDefaults: max follows min', () => {
  it('max 0 becomes min', () => {
    expect(planOrderpointDefaults(base({ orderpoint: { warehouseId: 'A', locationId: 'A-stock', productMinQty: 5 } }))).toEqual({
      kind: 'write',
      data: { productMaxQty: 5 },
    });
  });

  it('max below min becomes min when min changes; max above min stays', () => {
    const updated = { created: false, changedFields: ['productMinQty'] };
    expect(
      planOrderpointDefaults(base({ ...updated, orderpoint: { warehouseId: 'A', locationId: 'A-stock', productMinQty: 15, productMaxQty: 10 } })),
    ).toEqual({
      kind: 'write',
      data: { productMaxQty: 15 },
    });
    expect(
      planOrderpointDefaults(base({ ...updated, orderpoint: { warehouseId: 'A', locationId: 'A-stock', productMinQty: 15, productMaxQty: 30 } })),
    ).toEqual({
      kind: 'write',
      data: {},
    });
  });

  it('a max change alone does not touch max', () => {
    expect(
      planOrderpointDefaults(
        base({ created: false, changedFields: ['productMaxQty'], orderpoint: { warehouseId: 'A', locationId: 'A-stock', productMinQty: 15, productMaxQty: 10 } }),
      ),
    ).toEqual({ kind: 'write', data: {} });
  });
});

describe('isMaxTypedBelowMin', () => {
  it('refuses a max typed below the min', () => {
    expect(isMaxTypedBelowMin({ created: false, changedFields: ['productMaxQty'], productMinQty: 15, productMaxQty: 10 })).toBe(true);
  });

  it('refuses a max cleared to 0 under a min above 0', () => {
    expect(isMaxTypedBelowMin({ created: false, changedFields: ['productMaxQty'], productMinQty: 5, productMaxQty: 0 })).toBe(true);
  });

  it('accepts a max equal to or above the min', () => {
    expect(isMaxTypedBelowMin({ created: false, changedFields: ['productMaxQty'], productMinQty: 15, productMaxQty: 15 })).toBe(false);
    expect(isMaxTypedBelowMin({ created: false, changedFields: ['productMaxQty'], productMinQty: 15, productMaxQty: 30 })).toBe(false);
  });

  it('leaves a min change to raise the max instead', () => {
    expect(isMaxTypedBelowMin({ created: false, changedFields: ['productMinQty'], productMinQty: 15, productMaxQty: 10 })).toBe(false);
  });

  it('refuses min and max saved together with a max other than 0 below the min', () => {
    expect(isMaxTypedBelowMin({ created: false, changedFields: ['productMinQty', 'productMaxQty'], productMinQty: 15, productMaxQty: 10 })).toBe(true);
    expect(isMaxTypedBelowMin({ created: false, changedFields: ['productMinQty', 'productMaxQty'], productMinQty: 15, productMaxQty: 0 })).toBe(false);
  });

  it('refuses a new rule with a max other than 0 below the min, and raises a max left at 0', () => {
    expect(isMaxTypedBelowMin({ created: true, changedFields: [], productMinQty: 15, productMaxQty: 10 })).toBe(true);
    expect(isMaxTypedBelowMin({ created: true, changedFields: [], productMinQty: 5, productMaxQty: 0 })).toBe(false);
  });
});

describe('planOrderpointDefaults on update', () => {
  it('a new warehouse moves a location that is not inside it to the new stock', () => {
    expect(
      planOrderpointDefaults(
        base({ created: false, changedFields: ['warehouseId'], orderpoint: { warehouseId: 'B', locationId: 'A-stock' }, locationWarehouseId: 'A' }),
      ),
    ).toEqual({ kind: 'write', data: { locationId: 'B-stock' } });
  });

  it('a new warehouse moves the location to the new stock even when the location is already inside it', () => {
    expect(
      planOrderpointDefaults(
        base({ created: false, changedFields: ['warehouseId'], orderpoint: { warehouseId: 'B', locationId: 'B-shelf' }, locationWarehouseId: 'B' }),
      ),
    ).toEqual({ kind: 'write', data: { locationId: 'B-stock' } });
  });

  it('a warehouse save keeps a location saved after it', () => {
    expect(
      planOrderpointDefaults(
        base({
          created: false,
          changedFields: ['warehouseId'],
          orderpoint: { warehouseId: 'B', locationId: 'B-shelf' },
          saved: { warehouseId: 'B', locationId: 'A-stock' },
          locationWarehouseId: 'B',
        }),
      ),
    ).toEqual({ kind: 'write', data: {} });
  });

  it('a location save keeps a warehouse saved after it', () => {
    expect(
      planOrderpointDefaults(
        base({
          created: false,
          changedFields: ['locationId'],
          orderpoint: { warehouseId: 'A', locationId: 'B-stock' },
          saved: { warehouseId: 'B', locationId: 'B-stock' },
          locationWarehouseId: 'B',
        }),
      ),
    ).toEqual({ kind: 'write', data: {} });
  });

  it('a new location sets its warehouse', () => {
    expect(
      planOrderpointDefaults(
        base({ created: false, changedFields: ['locationId'], orderpoint: { warehouseId: 'A', locationId: 'B-stock' }, locationWarehouseId: 'B' }),
      ),
    ).toEqual({ kind: 'write', data: { warehouseId: 'B' } });
  });

  it('a new location outside every warehouse sets the first warehouse', () => {
    expect(
      planOrderpointDefaults(
        base({ created: false, changedFields: ['locationId'], orderpoint: { warehouseId: 'B', locationId: 'transit' }, locationWarehouseId: null }),
      ),
    ).toEqual({ kind: 'write', data: { warehouseId: 'A' } });
  });

  it('a warehouse and a location changed together are both kept', () => {
    expect(
      planOrderpointDefaults(
        base({
          created: false,
          changedFields: ['warehouseId', 'locationId'],
          orderpoint: { warehouseId: 'B', locationId: 'A-stock' },
          locationWarehouseId: 'A',
        }),
      ),
    ).toEqual({ kind: 'write', data: {} });
  });
});
