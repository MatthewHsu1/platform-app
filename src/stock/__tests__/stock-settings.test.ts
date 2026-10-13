import { afterEach, describe, expect, it } from 'vitest';

import { readStockSettings, todayUtc } from 'src/stock/stock-settings';

const NAMES = ['PRODUCT_UNIT_DIGITS', 'ANNUAL_INVENTORY_MONTH', 'ANNUAL_INVENTORY_DAY', 'REPLENISHMENT_HORIZON_DAYS', 'SHOW_EXPECTED_QUANTITY_COUNT'];

afterEach(() => {
  for (const name of NAMES) {
    delete process.env[name];
  }
});

describe('todayUtc', () => {
  it('is the UTC date, not the local one', () => {
    expect(todayUtc(new Date('2026-10-08T23:30:00-05:00'))).toBe('2026-10-09');
    expect(todayUtc(new Date('2026-10-08T00:10:00+02:00'))).toBe('2026-10-07');
  });
});

describe('readStockSettings', () => {
  it('uses the defaults when the variables are not set', () => {
    expect(readStockSettings()).toEqual({
      productUnitDigits: 2,
      annualInventoryMonth: 12,
      annualInventoryDay: 31,
      replenishmentHorizonDays: 365,
      showExpectedQuantityCount: false,
    });
  });

  it('reads the app variables, 0 included', () => {
    process.env.PRODUCT_UNIT_DIGITS = '3';
    process.env.ANNUAL_INVENTORY_MONTH = '0';
    process.env.ANNUAL_INVENTORY_DAY = '15';
    process.env.REPLENISHMENT_HORIZON_DAYS = '0';
    process.env.SHOW_EXPECTED_QUANTITY_COUNT = 'true';
    expect(readStockSettings()).toEqual({
      productUnitDigits: 3,
      annualInventoryMonth: 0,
      annualInventoryDay: 15,
      replenishmentHorizonDays: 0,
      showExpectedQuantityCount: true,
    });
  });
});
