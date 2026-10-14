import { describe, expect, it } from 'vitest';

import { planSerial } from 'src/fieldservice-equipment-stock/utils/plan-serial.util';

const base = {
  productId: 'treadmill',
  lotId: 'sn-1',
  lotProductId: 'treadmill',
  otherEquipmentWithLot: false,
  isCreate: false,
  updatedProduct: false,
  updatedLot: true,
  before: { productId: 'treadmill', lotId: null },
};

describe('planSerial', () => {
  it('keeps a serial of the equipment product that no other equipment holds', () => {
    expect(planSerial(base)).toEqual({ kind: 'keep' });
  });

  it('keeps equipment with no serial, no product, or a serial with no product', () => {
    expect(planSerial({ ...base, lotId: null, lotProductId: null })).toEqual({ kind: 'keep' });
    expect(planSerial({ ...base, productId: null })).toEqual({ kind: 'keep' });
    expect(planSerial({ ...base, lotProductId: null })).toEqual({ kind: 'keep' });
  });

  it('takes the serial from a new equipment when it belongs to another product', () => {
    expect(planSerial({ ...base, isCreate: true, lotProductId: 'bike' })).toEqual({
      kind: 'putBack',
      reason: 'serialOfOtherProduct',
      data: { lotId: null },
    });
  });

  it('gives a changed serial back when it belongs to another product', () => {
    expect(planSerial({ ...base, lotProductId: 'bike', before: { productId: 'treadmill', lotId: 'sn-0' } })).toEqual({
      kind: 'putBack',
      reason: 'serialOfOtherProduct',
      data: { lotId: 'sn-0' },
    });
  });

  it('gives the product back when a product change leaves the serial with another product', () => {
    expect(
      planSerial({ ...base, productId: 'bike', lotProductId: 'treadmill', updatedProduct: true, updatedLot: false, before: { productId: 'treadmill', lotId: 'sn-1' } }),
    ).toEqual({ kind: 'putBack', reason: 'serialOfOtherProduct', data: { productId: 'treadmill' } });
  });

  it('gives both back when one save changed the product and the serial', () => {
    expect(
      planSerial({ ...base, productId: 'bike', updatedProduct: true, before: { productId: 'treadmill', lotId: 'sn-0' } }),
    ).toEqual({ kind: 'putBack', reason: 'serialOfOtherProduct', data: { lotId: 'sn-0', productId: 'treadmill' } });
  });

  it('takes the serial from a new equipment when another equipment holds it', () => {
    expect(planSerial({ ...base, isCreate: true, otherEquipmentWithLot: true })).toEqual({
      kind: 'putBack',
      reason: 'serialTaken',
      data: { lotId: null },
    });
  });

  it('gives a changed serial back when another equipment holds it, and ignores a save that did not change the serial', () => {
    expect(planSerial({ ...base, otherEquipmentWithLot: true, before: { productId: 'treadmill', lotId: 'sn-0' } })).toEqual({
      kind: 'putBack',
      reason: 'serialTaken',
      data: { lotId: 'sn-0' },
    });
    expect(planSerial({ ...base, otherEquipmentWithLot: true, updatedLot: false, updatedProduct: true })).toEqual({ kind: 'keep' });
  });
});
