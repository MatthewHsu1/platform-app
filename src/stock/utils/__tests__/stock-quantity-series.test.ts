import { describe, expect, it } from 'vitest';

import { stockQuantitySeries } from 'src/stock/utils/stock-quantity-series.util';
import { type StockQuantitySeriesMove } from 'src/stock/utils/types/stock-quantity-series-move.type';

const TODAY = '2026-10-08';
const day = (offset: number) => {
  const date = new Date(`${TODAY}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const at = (offset: number) => `${day(offset)}T12:00:00.000Z`;

const warehouseOfLocation = new Map<string, string | null>([
  ['wh1-stock', 'wh1'],
  ['wh2-stock', 'wh2'],
  ['vendors', null],
  ['customers', null],
  ['adjustment', null],
  ['transit', null],
  ['wh1-transit', 'wh1'],
]);
const usageOfLocation = new Map([
  ['wh1-stock', 'INTERNAL'],
  ['wh2-stock', 'INTERNAL'],
  ['transit', 'TRANSIT'],
  ['wh1-transit', 'TRANSIT'],
]);
const move = (overrides: Partial<StockQuantitySeriesMove>): StockQuantitySeriesMove => ({
  state: 'CONFIRMED',
  date: at(0),
  productQty: 0,
  quantityProductUom: 0,
  locationId: 'wh1-stock',
  locationDestId: 'customers',
  locationFinalId: null,
  ...overrides,
});

describe('stockQuantitySeries', () => {
  it('rebuilds past days from done moves and lowers the future by planned deliveries', () => {
    const series = stockQuantitySeries({
      warehouseId: 'wh1',
      moves: [
        move({ state: 'DONE', locationId: 'vendors', locationDestId: 'wh1-stock', productQty: 100, quantityProductUom: 100 }),
        move({ state: 'PARTIALLY_AVAILABLE', date: at(3), productQty: 120 }),
      ],
      quants: [{ locationId: 'wh1-stock', quantity: 100, reservedQuantity: 100, removalDate: null }],
      warehouseOfLocation,
      usageOfLocation,
      today: TODAY,
      from: day(-1),
      to: day(4),
    });
    expect(series.map((row) => row.forecast)).toEqual([0, 100, 100, 100, -20, -20]);
  });

  it('shows receipts and deliveries on their day and the forecast after them', () => {
    const series = stockQuantitySeries({
      warehouseId: 'wh1',
      moves: [
        move({ state: 'DONE', locationId: 'adjustment', locationDestId: 'wh1-stock', productQty: 50, quantityProductUom: 50 }),
        move({ date: at(1), productQty: 20 }),
        move({ date: at(1), locationId: 'vendors', locationDestId: 'wh1-stock', productQty: 10 }),
        move({ date: at(-1), productQty: 30 }),
      ],
      quants: [{ locationId: 'wh1-stock', quantity: 50, reservedQuantity: 0, removalDate: null }],
      warehouseOfLocation,
      usageOfLocation,
      today: TODAY,
      from: day(-1),
      to: day(1),
    });
    expect(series).toEqual([
      { date: day(-1), forecast: -30, incoming: 0, outgoing: -30 },
      { date: day(0), forecast: 20, incoming: 0, outgoing: 0 },
      { date: day(1), forecast: 10, incoming: 10, outgoing: -20 },
    ]);
  });

  it('counts a move between two warehouses once as out and once as in', () => {
    const moves = [
      move({ state: 'DONE', locationDestId: 'wh2-stock', productQty: 1, quantityProductUom: 1 }),
      move({ date: at(2), locationDestId: 'wh2-stock', productQty: 1 }),
    ];
    const quants = [
      { locationId: 'wh1-stock', quantity: 2, reservedQuantity: 0, removalDate: null },
      { locationId: 'wh2-stock', quantity: 1, reservedQuantity: 0, removalDate: null },
    ];
    const forecastOf = (warehouseId: string) =>
      stockQuantitySeries({
        warehouseId,
        moves,
        quants,
        warehouseOfLocation,
        usageOfLocation,
        today: TODAY,
        from: day(-2),
        to: day(2),
      }).map((row) => row.forecast);
    expect(forecastOf('wh1')).toEqual([3, 3, 2, 2, 1]);
    expect(forecastOf('wh2')).toEqual([0, 0, 1, 1, 2]);
  });

  it('shows a delivery to transit as out of one warehouse and the receipt from transit as into the other', () => {
    const moves = [
      move({ state: 'ASSIGNED', locationDestId: 'transit', productQty: 25 }),
      move({ state: 'WAITING', locationId: 'transit', locationDestId: 'wh2-stock', productQty: 25 }),
    ];
    const todayOf = (warehouseId: string) =>
      stockQuantitySeries({
        warehouseId,
        moves,
        quants: [],
        warehouseOfLocation,
        usageOfLocation,
        today: TODAY,
        from: day(0),
        to: day(0),
      }).map(({ incoming, outgoing }) => ({ incoming, outgoing }));
    expect(todayOf('wh1')).toEqual([{ incoming: 0, outgoing: -25 }]);
    expect(todayOf('wh2')).toEqual([{ incoming: 25, outgoing: 0 }]);
  });

  it('counts stock in a transit location inside a warehouse for that warehouse only', () => {
    const quants = [
      { locationId: 'wh1-transit', quantity: 5, reservedQuantity: 0, removalDate: null },
      { locationId: 'transit', quantity: 7, reservedQuantity: 0, removalDate: null },
    ];
    const forecastOf = (warehouseId: string) =>
      stockQuantitySeries({
        warehouseId,
        moves: [],
        quants,
        warehouseOfLocation,
        usageOfLocation,
        today: TODAY,
        from: day(-1),
        to: day(1),
      }).map((row) => row.forecast);

    expect(forecastOf('wh1')).toEqual([5, 5, 5]);
    expect(forecastOf('wh2')).toEqual([0, 0, 0]);
  });

  it('uses the done quantity, not the demand, for a done move', () => {
    const series = stockQuantitySeries({
      warehouseId: 'wh1',
      moves: [move({ state: 'DONE', locationId: 'vendors', locationDestId: 'wh1-stock', productQty: 100, quantityProductUom: 40 })],
      quants: [{ locationId: 'wh1-stock', quantity: 40, reservedQuantity: 0, removalDate: null }],
      warehouseOfLocation,
      usageOfLocation,
      today: TODAY,
      from: day(-1),
      to: day(0),
    });
    expect(series.map((row) => row.forecast)).toEqual([0, 40]);
  });

  it('counts only the reserved part of stock past its removal date from today on', () => {
    const series = stockQuantitySeries({
      warehouseId: 'wh1',
      moves: [],
      quants: [{ locationId: 'wh1-stock', quantity: 10, reservedQuantity: 3, removalDate: `${day(-2)}T00:00:00.000Z` }],
      warehouseOfLocation,
      usageOfLocation,
      today: TODAY,
      from: day(-1),
      to: day(1),
    });
    expect(series.map((row) => row.forecast)).toEqual([10, 3, 3]);
  });
});
