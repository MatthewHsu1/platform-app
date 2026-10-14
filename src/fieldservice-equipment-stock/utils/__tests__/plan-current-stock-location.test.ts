import { describe, expect, it } from 'vitest';

import { planCurrentStockLocation } from 'src/fieldservice-equipment-stock/utils/plan-current-stock-location.util';

const quant = (locationId: string, inDate: string | null, quantity = 1, createdAt = '2026-01-01T00:00:00.000Z') => ({
  locationId,
  quantity,
  inDate,
  createdAt,
});

describe('planCurrentStockLocation', () => {
  it('names the location of the stock that came in last', () => {
    expect(planCurrentStockLocation([quant('warehouse', '2026-03-01T09:00:00.000Z'), quant('van', '2026-04-02T09:00:00.000Z')])).toBe('van');
  });

  it('puts stock with an incoming date ahead of stock without one', () => {
    expect(planCurrentStockLocation([quant('warehouse', null, 1, '2026-09-01T00:00:00.000Z'), quant('van', '2026-04-02T09:00:00.000Z')])).toBe('van');
  });

  it('breaks a tie on the incoming date by the creation time', () => {
    expect(
      planCurrentStockLocation([
        quant('warehouse', '2026-04-02T09:00:00.000Z', 1, '2026-04-02T09:00:01.000Z'),
        quant('van', '2026-04-02T09:00:00.000Z', 1, '2026-04-02T09:00:05.000Z'),
      ]),
    ).toBe('van');
  });

  it('skips stock that is gone or below zero', () => {
    expect(planCurrentStockLocation([quant('warehouse', '2026-03-01T09:00:00.000Z'), quant('customer', '2026-05-01T09:00:00.000Z', 0)])).toBe('warehouse');
    expect(planCurrentStockLocation([quant('warehouse', '2026-03-01T09:00:00.000Z'), quant('customer', '2026-05-01T09:00:00.000Z', -1)])).toBe('warehouse');
  });

  it('names no location for a serial with no stock', () => {
    expect(planCurrentStockLocation([])).toBeNull();
  });
});
