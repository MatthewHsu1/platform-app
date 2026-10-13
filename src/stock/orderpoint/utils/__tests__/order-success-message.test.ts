import { describe, expect, it } from 'vitest';

import { orderSuccessMessage } from 'src/stock/orderpoint/utils/order-success-message.util';

describe('orderSuccessMessage', () => {
  const move = { locationWarehouseId: 'WH1', locationUsage: 'INTERNAL', pickingName: 'WH1/OUT/00002' };

  it('names the transfer when the new move leaves another warehouse', () => {
    expect(orderSuccessMessage({ orderpointCount: 1, orderpointWarehouseId: 'WH2', firstMove: move })).toEqual({
      message: 'interWarehouse',
      pickingName: 'WH1/OUT/00002',
    });
  });

  it('names the transfer when the new move comes from transit', () => {
    expect(
      orderSuccessMessage({
        orderpointCount: 1,
        orderpointWarehouseId: 'WH2',
        firstMove: { locationWarehouseId: null, locationUsage: 'TRANSIT', pickingName: 'WH2/IN/00001' },
      }),
    ).toEqual({ message: 'interWarehouse', pickingName: 'WH2/IN/00001' });
  });

  it('is a plain success for a move of the same warehouse, several rules, or a move with no transfer', () => {
    expect(orderSuccessMessage({ orderpointCount: 1, orderpointWarehouseId: 'WH1', firstMove: move })).toEqual({ message: 'ordered', pickingName: null });
    expect(orderSuccessMessage({ orderpointCount: 2, orderpointWarehouseId: 'WH2', firstMove: move })).toEqual({ message: 'ordered', pickingName: null });
    expect(orderSuccessMessage({ orderpointCount: 1, orderpointWarehouseId: 'WH2', firstMove: { ...move, pickingName: null } })).toEqual({
      message: 'ordered',
      pickingName: null,
    });
    expect(orderSuccessMessage({ orderpointCount: 1, orderpointWarehouseId: 'WH2', firstMove: null })).toEqual({ message: 'ordered', pickingName: null });
  });
});
