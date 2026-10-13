import { describe, expect, it } from 'vitest';

import { orderpointsForMoves } from 'src/stock/orderpoint/utils/orderpoints-for-moves.util';

const orderpoints = [
  { id: 'op-a-wh1', productId: 'A', warehouseId: 'WH1' },
  { id: 'op-a-wh2', productId: 'A', warehouseId: 'WH2' },
  { id: 'op-b-wh1', productId: 'B', warehouseId: 'WH1' },
];

describe('orderpointsForMoves', () => {
  it("takes the product's rules in the move's source and destination warehouses", () => {
    expect(
      orderpointsForMoves({ moves: [{ productId: 'A', locationWarehouseId: 'WH1', locationDestWarehouseId: null }], orderpoints }),
    ).toEqual(['op-a-wh1']);
    expect(
      orderpointsForMoves({
        moves: [{ productId: 'A', locationWarehouseId: 'WH1', locationDestWarehouseId: 'WH2' }],
        orderpoints,
      }).sort(),
    ).toEqual(['op-a-wh1', 'op-a-wh2']);
  });

  it('takes every rule of the product when neither location is in a warehouse', () => {
    expect(
      orderpointsForMoves({ moves: [{ productId: 'A', locationWarehouseId: null, locationDestWarehouseId: null }], orderpoints }).sort(),
    ).toEqual(['op-a-wh1', 'op-a-wh2']);
  });

  it('never takes rules of another product', () => {
    expect(
      orderpointsForMoves({ moves: [{ productId: 'C', locationWarehouseId: 'WH1', locationDestWarehouseId: null }], orderpoints }),
    ).toEqual([]);
  });
});
