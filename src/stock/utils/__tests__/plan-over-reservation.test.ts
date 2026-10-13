import { describe, expect, it } from 'vitest';

import { planOverReservationCutBack } from 'src/stock/utils/plan-over-reservation.util';

const line = (id: string, quantityProductUom: number, createdAt: string, overrides = {}) => ({
  id,
  moveId: `move-${id}`,
  quantity: quantityProductUom,
  quantityProductUom,
  picked: false,
  createdAt,
  ...overrides,
});

describe('planOverReservationCutBack', () => {
  it('removes the newer of two reservations for the last unit', () => {
    expect(
      planOverReservationCutBack({
        quantity: 1,
        reservedQuantity: 2,
        lines: [line('older', 1, '2026-10-08T10:00:00.000Z'), line('newer', 1, '2026-10-08T10:00:01.000Z')],
        digits: 2,
      }),
    ).toEqual({ destroy: ['newer'], shrink: [], changedMoveIds: ['move-newer'] });
  });

  it('shrinks the newest line when part of it still fits', () => {
    expect(
      planOverReservationCutBack({
        quantity: 5,
        reservedQuantity: 7,
        lines: [line('a', 3, '2026-10-08T10:00:00.000Z'), line('b', 4, '2026-10-08T10:05:00.000Z')],
        digits: 2,
      }),
    ).toEqual({ destroy: [], shrink: [{ id: 'b', quantity: 2, quantityProductUom: 2 }], changedMoveIds: ['move-b'] });
  });

  it('shrinks a line in its own unit', () => {
    const dozens = line('d', 24, '2026-10-08T10:05:00.000Z', { quantity: 2 });
    expect(planOverReservationCutBack({ quantity: 12, reservedQuantity: 24, lines: [dozens], digits: 2 }).shrink).toEqual([
      { id: 'd', quantity: 1, quantityProductUom: 12 },
    ]);
  });

  it('leaves picked lines and does nothing when reserved fits', () => {
    const picked = line('picked', 1, '2026-10-08T10:09:00.000Z', { picked: true });
    expect(
      planOverReservationCutBack({ quantity: 1, reservedQuantity: 2, lines: [line('open', 1, '2026-10-08T10:00:00.000Z'), picked], digits: 2 }),
    ).toEqual({ destroy: ['open'], shrink: [], changedMoveIds: ['move-open'] });
    expect(planOverReservationCutBack({ quantity: 3, reservedQuantity: 3, lines: [line('x', 3, '2026-10-08T10:00:00.000Z')], digits: 2 })).toEqual({
      destroy: [],
      shrink: [],
      changedMoveIds: [],
    });
  });
});
