type StockSettings = {
  productUnitDigits: number;
  annualInventoryMonth: number;
  annualInventoryDay: number;
  replenishmentHorizonDays: number;
  showExpectedQuantityCount: boolean;
};

const readNumber = (name: string, fallback: number) => {
  const value = Number.parseFloat(process.env[name] ?? '');

  return Number.isFinite(value) ? value : fallback;
};

export const readStockSettings = (): StockSettings => ({
  productUnitDigits: readNumber('PRODUCT_UNIT_DIGITS', 2),
  annualInventoryMonth: readNumber('ANNUAL_INVENTORY_MONTH', 12),
  annualInventoryDay: readNumber('ANNUAL_INVENTORY_DAY', 31),
  replenishmentHorizonDays: readNumber('REPLENISHMENT_HORIZON_DAYS', 365),
  showExpectedQuantityCount: process.env.SHOW_EXPECTED_QUANTITY_COUNT === 'true',
});

export const todayUtc = (now: Date = new Date()) => now.toISOString().slice(0, 10);

export const nowIso = () => new Date().toISOString();
