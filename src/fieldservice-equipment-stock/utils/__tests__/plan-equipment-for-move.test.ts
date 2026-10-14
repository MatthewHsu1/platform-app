import { describe, expect, it } from 'vitest';

import { planEquipmentForMove, planEquipmentName } from 'src/fieldservice-equipment-stock/utils/plan-equipment-for-move.util';

const base = { productCreates: true, pickingTypeCreates: true, serialsWithEquipment: new Set<string>(), orderLocationId: 'site-1' };

describe('planEquipmentForMove', () => {
  it('makes one equipment for each serial moved, at the location of the order', () => {
    expect(
      planEquipmentForMove({
        ...base,
        lines: [
          { lotId: 'sn-1', quantity: 1 },
          { lotId: 'sn-2', quantity: 1 },
        ],
      }),
    ).toEqual([
      { lotId: 'sn-1', locationId: 'site-1' },
      { lotId: 'sn-2', locationId: 'site-1' },
    ]);
  });

  it('makes nothing unless the product and the operation type both ask for equipment', () => {
    const lines = [{ lotId: 'sn-1', quantity: 1 }];

    expect(planEquipmentForMove({ ...base, productCreates: false, lines })).toEqual([]);
    expect(planEquipmentForMove({ ...base, pickingTypeCreates: false, lines })).toEqual([]);
  });

  it('makes one equipment for a serial on two lines', () => {
    expect(
      planEquipmentForMove({
        ...base,
        lines: [
          { lotId: 'sn-1', quantity: 1 },
          { lotId: 'sn-1', quantity: 1 },
        ],
      }),
    ).toEqual([{ lotId: 'sn-1', locationId: 'site-1' }]);
  });

  it('skips a line without a serial or a quantity, and a serial that has equipment', () => {
    expect(
      planEquipmentForMove({
        ...base,
        serialsWithEquipment: new Set(['sn-3']),
        lines: [
          { lotId: null, quantity: 1 },
          { lotId: 'sn-2', quantity: 0 },
          { lotId: 'sn-3', quantity: 1 },
        ],
      }),
    ).toEqual([]);
  });

  it('leaves the location empty for a move made for no order', () => {
    expect(planEquipmentForMove({ ...base, orderLocationId: null, lines: [{ lotId: 'sn-1', quantity: 1 }] })).toEqual([{ lotId: 'sn-1', locationId: null }]);
  });
});

describe('planEquipmentName', () => {
  it('joins the product name and the serial', () => {
    expect(planEquipmentName('T8 Treadmill', 'SN0001')).toBe('T8 Treadmill SN0001');
  });
});
