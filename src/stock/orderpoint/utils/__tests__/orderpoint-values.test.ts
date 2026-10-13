import { describe, expect, it } from 'vitest';

import { type DeadlineMove } from 'src/stock/orderpoint/types/deadline-move.type';
import { type OrderpointValuesInput } from 'src/stock/orderpoint/types/orderpoint-values-input.type';
import { orderpointLeadTimes } from 'src/stock/orderpoint/utils/orderpoint-lead-times.util';
import { deadlineDate, orderpointValues } from 'src/stock/orderpoint/utils/orderpoint-values.util';
import { resolveUoms } from 'src/uom/utils/uom.util';

const { resolved } = resolveUoms([
  { id: 'Units', name: 'Units', relativeUomId: null, relativeFactor: 1, seedKey: null },
  { id: 'Pack10', name: 'pack of 10', relativeUomId: 'Units', relativeFactor: 10, seedKey: null },
  { id: 'Tenth', name: 'Test UoM', relativeUomId: 'Units', relativeFactor: 0.1, seedKey: null },
]);
const unit = (id: string) => {
  const uom = resolved.get(id);

  if (uom === undefined) {
    throw new Error(`Unknown unit ${id}`);
  }

  return uom;
};

const TODAY = '2025-09-02';

const input = (
  values: Partial<OrderpointValuesInput> & { min?: number; max?: number; manual?: number; trigger?: 'AUTO' | 'MANUAL' },
): OrderpointValuesInput => {
  const { min, max, manual, trigger, ...rest } = values;

  return {
    today: TODAY,
    horizonDays: 365,
    digits: 2,
    orderpoint: {
      trigger: trigger ?? 'AUTO',
      productMinQty: min ?? 0,
      productMaxQty: max ?? 0,
      qtyToOrderManual: manual ?? 0,
      routeId: null,
      locationId: 'stock',
    },
    leadTimes: { leadDays: 0, horizonTime: 365, leadHorizonDate: '2026-09-02' },
    hasRules: true,
    qtyOnHand: 0,
    qtyForecast: 0,
    qtyForecastNoEnd: 0,
    productUom: unit('Units'),
    replenishmentUom: null,
    deadlineMoves: [],
    warehouseScopeIds: new Set(['stock']),
    defaultRouteId: null,
    ...rest,
  };
};

describe('orderpointLeadTimes', () => {
  it('sums the delay of pull rules only, then adds the horizon', () => {
    const times = orderpointLeadTimes({
      today: TODAY,
      horizonDays: 365,
      rules: [
        { id: 'r1', name: 'Vendors → Stock', action: 'PULL', delay: 9 },
        { id: 'r2', name: 'Input → Stock', action: 'PUSH', delay: 4 },
      ],
    });
    expect(times).toEqual({ leadDays: 9, horizonTime: 365, leadHorizonDate: '2026-09-11' });
  });
});

describe('orderpointValues: quantity to order', () => {
  it('rounds max − forecast up to a whole number of the multiple', () => {
    const base = { min: 15, max: 30, qtyOnHand: 14.5, qtyForecast: 14.5 };
    expect(orderpointValues(input({ ...base, replenishmentUom: unit('Pack10') })).qtyToOrderComputed).toBe(20);
    expect(orderpointValues(input({ ...base, replenishmentUom: unit('Units') })).qtyToOrderComputed).toBe(16);
    expect(orderpointValues(input(base)).qtyToOrderComputed).toBe(15.5);
  });

  it('keeps a decimal remainder exact with a multiple below one unit', () => {
    expect(orderpointValues(input({ min: 4, max: 5.1, replenishmentUom: unit('Tenth') })).qtyToOrderComputed).toBe(5.1);
  });

  it('rounds the result up to the product unit precision: whole units at 0 digits', () => {
    const base = { min: 4, max: 5.1, replenishmentUom: unit('Tenth') };
    expect(orderpointValues(input({ ...base, digits: 0 })).qtyToOrderComputed).toBe(6);
    expect(orderpointValues(input({ min: 15, max: 30, qtyForecast: 14.5, replenishmentUom: unit('Pack10'), digits: 0 })).qtyToOrderComputed).toBe(20);
  });

  it('orders up to max when the forecast is negative', () => {
    expect(orderpointValues(input({ min: 0, max: 5, qtyForecast: -12 })).qtyToOrderComputed).toBe(17);
  });

  it('orders nothing while the forecast is at or above min', () => {
    expect(orderpointValues(input({ min: 5, max: 200, qtyOnHand: 10, qtyForecast: 10 })).qtyToOrderComputed).toBe(0);
    expect(orderpointValues(input({ min: 10, max: 10, qtyForecast: 10 })).qtyToOrderComputed).toBe(0);
  });

  it('on a manual rule, orders nothing while a receipt covers min and up to max once it is gone', () => {
    expect(orderpointValues(input({ trigger: 'MANUAL', min: 10, max: 10, qtyForecast: 10 })).qtyToOrder).toBe(0);
    expect(orderpointValues(input({ trigger: 'MANUAL', min: 10, max: 10, qtyForecast: 0 })).qtyToOrder).toBe(10);
  });

  it('follows new demand: 5, then 6 after one more out', () => {
    expect(orderpointValues(input({ min: 5, max: 5, qtyForecast: 0 })).qtyToOrder).toBe(5);
    expect(orderpointValues(input({ min: 5, max: 5, qtyForecast: -1 })).qtyToOrder).toBe(6);
  });

  it('uses the typed quantity when one is set', () => {
    const values = orderpointValues(input({ min: 10, max: 10, qtyForecast: 0, manual: 7 }));
    expect(values.qtyToOrderComputed).toBe(10);
    expect(values.qtyToOrder).toBe(7);
  });

  it('compares the forecast with min at the unit precision', () => {
    expect(orderpointValues(input({ min: 10, max: 10, qtyForecast: 9.999 })).qtyToOrderComputed).toBe(0);
  });
});

describe('orderpointValues: warnings, route, lead values', () => {
  it('warns when the order would push the stock above max', () => {
    expect(orderpointValues(input({ min: 10, max: 10, manual: 5, qtyForecastNoEnd: 8 })).unwantedReplenish).toBe(true);
    expect(orderpointValues(input({ min: 10, max: 10, manual: 5, qtyForecastNoEnd: 5 })).unwantedReplenish).toBe(false);
    expect(orderpointValues(input({ min: 10, max: 10, qtyForecast: 10, qtyForecastNoEnd: 50 })).unwantedReplenish).toBe(false);
  });

  it('shows the supply warning when no rule replenishes the location', () => {
    expect(orderpointValues(input({ hasRules: false })).showSupplyWarning).toBe(true);
    expect(orderpointValues(input({ hasRules: true })).showSupplyWarning).toBe(false);
  });

  it('takes the chosen route, else the default route', () => {
    expect(orderpointValues(input({ defaultRouteId: 'reception' })).effectiveRouteId).toBe('reception');
    const chosen = input({ defaultRouteId: 'reception' });
    chosen.orderpoint.routeId = 'resupply';
    expect(orderpointValues(chosen).effectiveRouteId).toBe('resupply');
  });

  it('copies on hand, forecast and the lead values', () => {
    const values = orderpointValues(
      input({ qtyOnHand: 3, qtyForecast: -2, leadTimes: { leadDays: 9, horizonTime: 365, leadHorizonDate: '2026-09-11' } }),
    );
    expect(values).toMatchObject({ qtyOnHand: 3, qtyForecast: -2, leadDays: 9, leadHorizonDate: '2026-09-11' });
  });
});

describe('deadlineDate: 20 on hand, min 10, today 2025-09-02', () => {
  const scope = new Set(['stock', 'stock-output']);
  const dayAfter = (days: number) => new Date(Date.parse(`${TODAY}T12:00:00.000Z`) + days * 86_400_000).toISOString();
  const out = (days: number, productQty: number): DeadlineMove => ({
    locationId: 'stock',
    locationDestId: 'customers',
    locationFinalId: null,
    date: dayAfter(days),
    productQty,
  });
  const receipt = (days: number, productQty: number): DeadlineMove => ({ ...out(days, productQty), locationId: 'vendors', locationDestId: 'stock' });
  const deadline = (moves: DeadlineMove[], horizonDays = 365, leadDays = 0) =>
    deadlineDate({ today: TODAY, horizonDays, leadDays, qtyOnHand: 20, productMinQty: 10, locationId: 'stock', warehouseScopeIds: scope, moves });

  it('15 out in 15 days, 10 in in 25 days: the 15th day', () => {
    expect(deadline([out(15, 15), receipt(25, 10)])).toBe('2025-09-17');
  });

  it('10 out in 25 days, 5 out in 35 days: the 35th day; with a 30-day horizon: none', () => {
    expect(deadline([out(25, 10), out(35, 5)])).toBe('2025-10-07');
    expect(deadline([out(25, 10), out(35, 5)], 30)).toBeNull();
  });

  it('15 out and 15 in on day 15, 15 out on day 25: the 25th day', () => {
    expect(deadline([out(15, 15), receipt(15, 15), out(25, 15)])).toBe('2025-09-27');
  });

  it('is today when on hand is already below min', () => {
    expect(
      deadlineDate({ today: TODAY, horizonDays: 365, leadDays: 0, qtyOnHand: 5, productMinQty: 10, locationId: 'stock', warehouseScopeIds: scope, moves: [] }),
    ).toBe(TODAY);
  });

  it('moves the deadline back by the lead days', () => {
    expect(deadline([out(15, 15)], 365, 9)).toBe('2025-09-08');
  });

  it('counts a move dated on the horizon day itself', () => {
    expect(deadline([out(30, 15)], 30, 9)).toBe('2025-09-23');
  });

  it('counts a move that ends outside the warehouses through a later step', () => {
    expect(deadline([{ ...out(15, 15), locationDestId: 'stock-output', locationFinalId: 'customers' }], 365)).toBe('2025-09-17');
  });

  it('ignores moves inside the warehouses and moves of other locations', () => {
    const internal: DeadlineMove = { ...out(15, 15), locationDestId: 'stock' };
    const elsewhere: DeadlineMove = { ...out(15, 15), locationId: 'shelf' };
    expect(deadline([internal, elsewhere])).toBeNull();
  });
});
