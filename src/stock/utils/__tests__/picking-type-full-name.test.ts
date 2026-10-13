import { describe, expect, it } from 'vitest';

import { pickingTypeFullName, planPickingTypeFullNames } from 'src/stock/utils/picking-type-full-name.util';

describe('pickingTypeFullName', () => {
  it('puts the warehouse name before the type name', () => {
    expect(pickingTypeFullName('Receipts', 'San Francisco')).toBe('San Francisco: Receipts');
  });

  it('is the type name alone when the type has no warehouse', () => {
    expect(pickingTypeFullName('Dropship', null)).toBe('Dropship');
  });
});

describe('planPickingTypeFullNames', () => {
  const warehouses = [
    { id: 'wh-sf', name: 'San Francisco' },
    { id: 'wh-chi', name: 'Chicago' },
  ];

  it('writes the full name of each type whose stored name is out of date', () => {
    const types = [
      { id: 't1', name: 'Receipts', warehouseId: 'wh-sf', completeName: null },
      { id: 't2', name: 'Receipts', warehouseId: 'wh-chi', completeName: 'Old name: Receipts' },
      { id: 't3', name: 'Dropship', warehouseId: null, completeName: 'San Francisco: Dropship' },
    ];

    expect(planPickingTypeFullNames(types, warehouses)).toEqual([
      { id: 't1', data: { completeName: 'San Francisco: Receipts' } },
      { id: 't2', data: { completeName: 'Chicago: Receipts' } },
      { id: 't3', data: { completeName: 'Dropship' } },
    ]);
  });

  it('writes nothing for a type whose full name is already right', () => {
    const types = [{ id: 't1', name: 'Delivery Orders', warehouseId: 'wh-chi', completeName: 'Chicago: Delivery Orders' }];

    expect(planPickingTypeFullNames(types, warehouses)).toEqual([]);
  });

  it('names a type whose warehouse is no longer there by its own name', () => {
    const types = [{ id: 't1', name: 'Receipts', warehouseId: 'wh-gone', completeName: 'Gone: Receipts' }];

    expect(planPickingTypeFullNames(types, warehouses)).toEqual([{ id: 't1', data: { completeName: 'Receipts' } }]);
  });
});
