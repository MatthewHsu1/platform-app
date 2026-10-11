import { describe, expect, it } from 'vitest';

import { forecastDraftQuantities, forecastLines } from 'src/stock/utils/forecast-lines.util';
import { type ForecastExpiry } from 'src/stock/utils/types/forecast-expiry.type';
import { type ForecastMove } from 'src/stock/utils/types/forecast-move.type';

const TODAY = '2026-10-08';
const NOW = '2026-10-08T12:00:00.000Z';
const WAREHOUSE = new Set(['view', 'stock', 'shelf', 'input']);

let created = 0;
const move = (overrides: Partial<ForecastMove> & Pick<ForecastMove, 'id'>): ForecastMove => {
  created += 1;
  return {
    createdAt: `2026-10-01T00:00:${String(created).padStart(2, '0')}.000Z`,
    productId: 'P',
    state: 'CONFIRMED',
    productQty: 0,
    quantity: 0,
    date: NOW,
    reservationDate: TODAY,
    priority: 'NORMAL',
    locationId: 'stock',
    locationDestId: 'customers',
    locationFinalId: null,
    pickingId: overrides.id,
    pickingName: overrides.id.toUpperCase(),
    moveOrigIds: [],
    moveDestIds: [],
    ...overrides,
  };
};
const receipt = (overrides: Partial<ForecastMove> & Pick<ForecastMove, 'id'>) =>
  move({ locationId: 'vendors', locationDestId: 'stock', reservationDate: null, ...overrides });

const run = (
  moves: ForecastMove[],
  quants: { locationId: string; quantity: number }[] = [],
  expiry?: ForecastExpiry,
) =>
  forecastLines({
    productIds: ['P'],
    moves,
    quants: quants.map((quant) => ({ productId: 'P', ...quant })),
    warehouseLocationIds: WAREHOUSE,
    stockLocationId: 'stock',
    stockSubLocationIds: new Set(['shelf']),
    today: TODAY,
    now: NOW,
    digits: 2,
    expiry,
  });

const summary = (lines: ReturnType<typeof run>) =>
  lines.map((line) => ({
    quantity: line.quantity,
    in: line.documentIn?.id ?? null,
    out: line.documentOut?.id ?? null,
    filled: line.replenishmentFilled,
  }));

describe('forecastLines for a delivery and its receipts', () => {
  it('shows one empty free-stock line for a product with nothing planned', () => {
    expect(summary(run([]))).toEqual([{ quantity: 0, in: null, out: null, filled: true }]);
  });

  it('counts draft receipts and deliveries in the header, not in the lines', () => {
    const moves = [
      receipt({ id: 'receipt', state: 'DRAFT', productQty: 2 }),
      move({ id: 'delivery', state: 'DRAFT', productQty: 5 }),
    ];
    expect(forecastDraftQuantities({ moves, warehouseLocationIds: WAREHOUSE }).get('P')).toEqual({ in: 2, out: 5 });
    expect(summary(run(moves))).toEqual([{ quantity: 0, in: null, out: null, filled: true }]);
  });

  it('shows an unfilled delivery of 5 once it is confirmed', () => {
    const moves = [receipt({ id: 'receipt', state: 'DRAFT', productQty: 2 }), move({ id: 'delivery', productQty: 5 })];
    expect(forecastDraftQuantities({ moves, warehouseLocationIds: WAREHOUSE }).get('P')).toEqual({ in: 2, out: 0 });
    expect(summary(run(moves))).toEqual([{ quantity: 5, in: null, out: 'delivery', filled: false }]);
  });

  it('fills 2 of the 5 from the confirmed receipt and leaves 3 unfilled', () => {
    expect(summary(run([receipt({ id: 'receipt', productQty: 2 }), move({ id: 'delivery', productQty: 5 })]))).toEqual([
      { quantity: 2, in: 'receipt', out: 'delivery', filled: true },
      { quantity: 3, in: null, out: 'delivery', filled: false },
    ]);
  });

  it('shows the reserved 2 and the 3 a second receipt brings once the first receipt is done', () => {
    const lines = run(
      [
        move({ id: 'delivery', state: 'PARTIALLY_AVAILABLE', productQty: 5, quantity: 2 }),
        receipt({ id: 'receipt2', productQty: 3 }),
      ],
      [{ locationId: 'stock', quantity: 2 }],
    );
    expect(summary(lines)).toEqual([
      { quantity: 2, in: null, out: 'delivery', filled: true },
      { quantity: 3, in: 'receipt2', out: 'delivery', filled: true },
    ]);
    expect(lines[0].reservation).toEqual({ id: 'delivery', name: 'DELIVERY' });
  });

  it('marks stock reserved by a move outside any transfer as reserved, with no transfer to name', () => {
    const lines = run(
      [move({ id: 'loose', state: 'ASSIGNED', productQty: 2, quantity: 2, pickingId: null, pickingName: null })],
      [{ locationId: 'stock', quantity: 2 }],
    );

    expect(summary(lines)).toEqual([{ quantity: 2, in: null, out: null, filled: true }]);
    expect(lines[0].reservation).toEqual({ id: null, name: '' });
  });
});

describe('forecastLines with a receipt larger than the delivery', () => {
  it('lists the receipt against the delivery first, then its unused rest', () => {
    expect(summary(run([receipt({ id: 'receipt', productQty: 6 }), move({ id: 'delivery', productQty: 3 })]))).toEqual([
      { quantity: 3, in: 'receipt', out: 'delivery', filled: true },
      { quantity: 3, in: 'receipt', out: null, filled: true },
    ]);
  });
});

describe('forecastLines ordered by date', () => {
  const deliveries = [
    move({ id: 'd1', productQty: 5, date: '2026-10-08T12:00:00.000Z' }),
    move({ id: 'd2', productQty: 5, date: '2026-10-08T13:00:00.000Z' }),
    move({ id: 'd3', productQty: 5, date: '2026-10-08T11:00:00.000Z' }),
    move({ id: 'd4', productQty: 5, date: '2026-10-09T12:00:00.000Z' }),
    move({ id: 'd5', productQty: 5, date: '2026-10-07T12:00:00.000Z' }),
    move({ id: 'd6', productQty: 5, date: '2026-11-07T12:00:00.000Z' }),
    move({ id: 'd7', productQty: 5, date: '2026-09-08T12:00:00.000Z' }),
  ];

  it('orders deliveries by date', () => {
    expect(run(deliveries).map((line) => line.documentOut?.id)).toEqual(['d7', 'd5', 'd3', 'd1', 'd2', 'd4', 'd6']);
  });

  it('matches receipts by date and flags a delivery due before its receipt as late', () => {
    const lines = run([
      ...deliveries,
      receipt({ id: 'r1', productQty: 5, date: '2026-11-07T12:00:00.000Z' }),
      receipt({ id: 'r2', productQty: 5, date: '2026-09-08T12:00:00.000Z' }),
      receipt({ id: 'r3', productQty: 10, date: '2026-10-08T11:00:00.000Z' }),
    ]);
    expect(lines.map((line) => [line.documentOut?.id, line.documentIn?.id ?? null])).toEqual([
      ['d7', 'r2'],
      ['d5', 'r3'],
      ['d3', 'r3'],
      ['d1', 'r1'],
      ['d2', null],
      ['d4', null],
      ['d6', null],
    ]);
    expect(lines.slice(0, 4).map((line) => line.isLate)).toEqual([false, true, false, true]);
  });
});

describe('forecastLines with a receipt linked to a delivery', () => {
  it('gives a linked receipt to its own delivery first', () => {
    const lines = run([
      move({ id: 'D1', productQty: 100 }),
      move({ id: 'D2', productQty: 200 }),
      receipt({ id: 'R', productQty: 200, moveDestIds: ['D2'] }),
    ]);
    expect(summary(lines)).toEqual([
      { quantity: 200, in: 'R', out: 'D2', filled: true },
      { quantity: 100, in: null, out: 'D1', filled: false },
    ]);
  });
});

describe('forecastLines for deliveries not reserved yet', () => {
  it('lists deliveries to reserve today first, then by reservation date, unplanned last', () => {
    const lines = run([
      move({ id: 'manual', productQty: 3, date: '2026-09-28T12:00:00.000Z', reservationDate: null }),
      move({ id: 'byDate', productQty: 3, date: '2026-10-13T12:00:00.000Z', reservationDate: '2026-10-07' }),
      move({
        id: 'byDatePriority',
        productQty: 3,
        priority: 'URGENT',
        date: '2026-10-13T12:00:00.000Z',
        reservationDate: '2026-10-09',
      }),
      move({ id: 'atConfirm', productQty: 3, reservationDate: TODAY }),
    ]);
    expect(lines.map((line) => line.documentOut?.id)).toEqual(['atConfirm', 'byDate', 'byDatePriority', 'manual']);
  });
});

describe('forecastLines with stock outside the stock location', () => {
  it('covers a delivery with stock still in the input location, marked in transit', () => {
    const lines = run([move({ id: 'delivery', productQty: 2 })], [{ locationId: 'input', quantity: 2 }]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ quantity: 2, moveOutId: 'delivery', inTransit: true });
  });

  it('takes stock from a shelf under Stock and shows the rest as free', () => {
    const lines = run(
      [move({ id: 'delivery', productQty: 3, locationId: 'shelf' })],
      [{ locationId: 'shelf', quantity: 10 }],
    );
    expect(summary(lines)).toEqual([
      { quantity: 3, in: null, out: 'delivery', filled: true },
      { quantity: 7, in: null, out: null, filled: true },
    ]);
  });
});

describe('forecastLines with expiry dates', () => {
  it('lists stock to remove now, stock to remove on a date, then the free stock', () => {
    const lines = run([], [{ locationId: 'stock', quantity: 7 }], {
      productIds: new Set(['P']),
      expiredQuants: [{ productId: 'P', reservedQuantity: 1, availableQuantity: 4 }],
      freshQuants: [
        { productId: 'P', removalDay: '2026-12-01', availableQuantity: 5 },
        { productId: 'P', removalDay: null, availableQuantity: 2 },
      ],
    });
    expect(lines.map((line) => [line.quantity, line.removalDate])).toEqual([
      [4, 'NOW'],
      [5, '2026-12-01'],
      [8, null],
    ]);
  });

  it('shows one line per removal day, summing the stock of that day', () => {
    const lines = run([], [{ locationId: 'stock', quantity: 9 }], {
      productIds: new Set(['P']),
      expiredQuants: [],
      freshQuants: [
        { productId: 'P', removalDay: '2026-12-01', availableQuantity: 3 },
        { productId: 'P', removalDay: '2026-11-01', availableQuantity: 2 },
        { productId: 'P', removalDay: '2026-12-01', availableQuantity: 4 },
      ],
    });
    expect(lines.map((line) => [line.quantity, line.removalDate])).toEqual([
      [2, '2026-11-01'],
      [7, '2026-12-01'],
      [9, null],
    ]);
  });
});
