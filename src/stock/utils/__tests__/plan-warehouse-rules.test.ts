import { describe, expect, it } from 'vitest';

import { warehouseActiveRefusal } from 'src/stock/utils/plan-warehouse-rules.util';

const OWN_TYPES = [
  { id: 'in', name: 'Receipts', active: true, defaultLocationSrcId: 'vendors', defaultLocationDestId: 'stock' },
  { id: 'old', name: 'Old pick', active: false, defaultLocationSrcId: 'stock', defaultLocationDestId: 'out' },
];

describe('warehouseActiveRefusal', () => {
  it('refuses while moves of its types (archived types too) are open, naming each type once', () => {
    expect(
      warehouseActiveRefusal({
        warehouseName: 'Main',
        ownTypes: OWN_TYPES,
        openMoveTypeIds: ['old', 'in', 'old'],
        locationIdsUnderView: ['stock', 'out'],
        otherTypes: [],
      }),
    ).toEqual({
      message: 'You still have ongoing operations for operation types {operations} in warehouse {warehouse}',
      values: { operations: 'Old pick, Receipts', warehouse: 'Main' },
    });
  });

  it('refuses when an active type of another warehouse has both defaults inside this tree', () => {
    expect(
      warehouseActiveRefusal({
        warehouseName: 'Main',
        ownTypes: OWN_TYPES,
        openMoveTypeIds: [],
        locationIdsUnderView: ['stock', 'out'],
        otherTypes: [
          { id: 'x', name: 'Transit in', active: true, defaultLocationSrcId: 'stock', defaultLocationDestId: 'out' },
          { id: 'y', name: 'Half in', active: true, defaultLocationSrcId: 'elsewhere', defaultLocationDestId: 'out' },
          { id: 'z', name: 'Archived', active: false, defaultLocationSrcId: 'stock', defaultLocationDestId: 'out' },
        ],
      }),
    ).toEqual({
      message: '{operations} have default source or destination locations within warehouse {warehouse}, therefore you cannot archive it.',
      values: { operations: 'Transit in', warehouse: 'Main' },
    });
  });

  it('allows the change otherwise', () => {
    expect(
      warehouseActiveRefusal({
        warehouseName: 'Main',
        ownTypes: OWN_TYPES,
        openMoveTypeIds: [],
        locationIdsUnderView: ['stock'],
        otherTypes: [],
      }),
    ).toBeNull();
  });
});
