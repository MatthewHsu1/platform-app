import { describe, expect, it } from 'vitest';

import { forecastRows } from 'src/stock/utils/forecast-rows.util';
import { type ForecastLine } from 'src/stock/utils/types/forecast-line.type';

const line = (overrides: Partial<ForecastLine>): ForecastLine => ({
  productId: 'P',
  quantity: 0,
  moveInId: null,
  moveOutId: null,
  documentIn: null,
  documentOut: null,
  receiptDate: null,
  deliveryDate: null,
  replenishmentFilled: true,
  isLate: false,
  deliveryLate: false,
  receiptLate: false,
  inTransit: false,
  isMatched: false,
  reservation: null,
  removalDate: null,
  ...overrides,
});
const delivery = (name: string, overrides: Partial<ForecastLine> = {}) =>
  line({ moveOutId: `move-${name}`, documentOut: { id: name, name }, ...overrides });

const rowsOf = (lines: ForecastLine[], freeQty = 0, useExpirationDate = false) =>
  forecastRows({ lines, productIds: ['P'], freeQtyOf: () => freeQty, useExpirationDate, digits: 2 });

describe('forecastRows', () => {
  it('offers Unreserve on a reserved delivery and nothing on the receipt line of the same delivery', () => {
    const rows = rowsOf([
      delivery('OUT1', { quantity: 2, reservation: { id: 'OUT1', name: 'OUT1' } }),
      delivery('OUT1', { quantity: 3, moveInId: 'in', documentIn: { id: 'IN1', name: 'IN1' } }),
    ]);

    expect(rows.map((row) => [row.available, row.action])).toEqual([
      ['stockToReserve', { kind: 'unreserve' }],
      ['receipt', null],
    ]);
  });

  it('offers Reserve on a delivery covered by stock, and on an uncovered one with the stock that can still be taken', () => {
    const rows = rowsOf([delivery('OUT1', { quantity: 2 }), delivery('OUT2', { quantity: 3, replenishmentFilled: false })], 1);

    expect(rows.map((row) => [row.available, row.action])).toEqual([
      ['stockToReserve', { kind: 'reserve', quantity: null }],
      ['notAvailable', { kind: 'reserve', quantity: 2 }],
    ]);
  });

  it('offers nothing on an uncovered delivery when the product has no free stock', () => {
    const rows = rowsOf([delivery('OUT2', { quantity: 3, replenishmentFilled: false })], 0);

    expect(rows.map((row) => row.action)).toEqual([null]);
  });

  it('offers nothing on stock in transit or on a delivery outside any transfer', () => {
    const rows = rowsOf(
      [delivery('OUT1', { quantity: 2, inTransit: true }), line({ moveOutId: 'loose', quantity: 1 })],
      5,
    );

    expect(rows.map((row) => [row.available, row.action])).toEqual([
      ['stockInTransit', null],
      ['freeStock', null],
    ]);
  });

  it('drops an empty free-stock line when the product has other lines, and keeps it when alone', () => {
    expect(rowsOf([delivery('OUT1', { quantity: 2, replenishmentFilled: false }), line({ quantity: 0 })]).length).toEqual(1);
    expect(rowsOf([line({ quantity: 0 })]).map((row) => row.available)).toEqual(['freeStock']);
  });

  it('puts stock to remove now first and takes the dated stock out of the undated free stock', () => {
    const rows = rowsOf(
      [
        line({ quantity: 4, removalDate: '2026-11-01' }),
        line({ quantity: 1, removalDate: 'NOW' }),
        line({ quantity: 10 }),
      ],
      0,
      true,
    );

    expect(rows.map((row) => [row.available, row.line.quantity, row.line.removalDate])).toEqual([
      ['expired', 1, 'NOW'],
      ['freeStock', 4, '2026-11-01'],
      ['freeStock', 6, null],
    ]);
  });

  it('removes the undated free stock when the dated stock is all of it', () => {
    const rows = rowsOf([line({ quantity: 4, removalDate: '2026-11-01' }), line({ quantity: 4 })], 0, true);

    expect(rows.map((row) => row.line.removalDate)).toEqual(['2026-11-01']);
  });

  it('groups the lines of several variants in the order of the variants, marking where each starts', () => {
    const rows = forecastRows({
      lines: [line({ productId: 'B', quantity: 1 }), line({ productId: 'A', quantity: 2 })],
      productIds: ['A', 'B'],
      freeQtyOf: () => 0,
      useExpirationDate: false,
      digits: 2,
    });

    expect(rows.map((row) => [row.line.productId, row.startsProduct])).toEqual([
      ['A', true],
      ['B', true],
    ]);
  });
});
