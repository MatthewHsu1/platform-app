import { describe, expect, it } from 'vitest';

import { type OrderWarehouseInput } from 'src/fieldservice-stock/types/order-warehouse-input.type';
import { planOrderWarehouse } from 'src/fieldservice-stock/utils/plan-order-warehouse.util';

const updated: OrderWarehouseInput = {
  created: false,
  staffSave: true,
  warehouseBefore: 'north',
  warehouse: 'north',
  warehouseWritten: false,
  workerWritten: false,
  workerDefaultWarehouse: null,
  completed: false,
  oldestWarehouse: 'main',
};
const created: OrderWarehouseInput = { ...updated, created: true, warehouseBefore: null, warehouse: null };

describe('planOrderWarehouse', () => {
  it('gives a new order the first warehouse', () => {
    expect(planOrderWarehouse(created)).toEqual({ kind: 'set', warehouseId: 'main' });
  });

  it('gives a new order with a worker the default warehouse of that worker', () => {
    expect(planOrderWarehouse({ ...created, workerWritten: true, workerDefaultWarehouse: 'south' })).toEqual({ kind: 'set', warehouseId: 'south' });
  });

  it('keeps a warehouse a new order already has, whatever its worker prefers', () => {
    expect(planOrderWarehouse({ ...created, warehouse: 'north', warehouseWritten: true, workerWritten: true, workerDefaultWarehouse: 'south' })).toEqual({
      kind: 'keep',
    });
  });

  it('refuses a new order when no warehouse exists', () => {
    expect(planOrderWarehouse({ ...created, oldestWarehouse: null })).toEqual({ kind: 'refuse', reason: 'Create a warehouse first.' });
  });

  it('fills the default warehouse of a worker picked later', () => {
    expect(planOrderWarehouse({ ...updated, workerWritten: true, workerDefaultWarehouse: 'south' })).toEqual({ kind: 'set', warehouseId: 'south' });
  });

  it('leaves the warehouse alone when the same save sets it, when the worker has no default, and when the order is completed', () => {
    expect(planOrderWarehouse({ ...updated, workerWritten: true, workerDefaultWarehouse: 'south', warehouseWritten: true })).toEqual({ kind: 'keep' });
    expect(planOrderWarehouse({ ...updated, workerWritten: true, workerDefaultWarehouse: null })).toEqual({ kind: 'keep' });
    expect(planOrderWarehouse({ ...updated, workerWritten: true, workerDefaultWarehouse: 'south', completed: true })).toEqual({ kind: 'keep' });
  });

  it('puts back a warehouse staff cleared', () => {
    expect(planOrderWarehouse({ ...updated, warehouse: null, warehouseWritten: true })).toEqual({
      kind: 'putBack',
      warehouseId: 'north',
      reason: 'A service order needs a warehouse.',
    });
  });

  it('gives an older order without a warehouse the first one on its next save', () => {
    expect(planOrderWarehouse({ ...updated, warehouseBefore: null, warehouse: null })).toEqual({ kind: 'set', warehouseId: 'main' });
  });

  it('ignores a save the app made itself', () => {
    expect(planOrderWarehouse({ ...updated, staffSave: false, warehouse: null, warehouseWritten: true })).toEqual({ kind: 'keep' });
  });
});
