import { describe, expect, it } from 'vitest';

import {
  leadDaysLines,
  planMinMaxSave,
  replenishmentGraph,
  replenishmentPeriod,
  resupplyOptions,
} from 'src/stock/orderpoint/utils/replenishment-info.util';

const NOW = '2025-08-14T10:00:00.000Z';

describe('replenishmentPeriod', () => {
  it('last 30 days is one calendar month back: 31 days on 14 August', () => {
    expect(replenishmentPeriod('ONE_MONTH', NOW)).toEqual({ from: '2025-07-14T10:00:00.000Z', to: NOW, days: 31 });
  });

  it('last 7 days', () => {
    expect(replenishmentPeriod('ONE_WEEK', NOW)).toEqual({ from: '2025-08-07T10:00:00.000Z', to: NOW, days: 7 });
  });

  it('last 3 and 12 months keep the day of the month', () => {
    expect(replenishmentPeriod('THREE_MONTHS', NOW).from).toBe('2025-05-14T10:00:00.000Z');
    expect(replenishmentPeriod('ONE_YEAR', NOW)).toEqual({ from: '2024-08-14T10:00:00.000Z', to: NOW, days: 365 });
  });

  it('a month back from the 31st ends on the last day of the shorter month', () => {
    expect(replenishmentPeriod('ONE_MONTH', '2025-03-31T08:00:00.000Z').from).toBe('2025-02-28T08:00:00.000Z');
  });

  it('same month last year, the two after it, and the quarter from it', () => {
    expect(replenishmentPeriod('LAST_YEAR', NOW)).toEqual({
      from: '2024-08-01T00:00:00.000Z',
      to: '2024-09-01T00:00:00.000Z',
      days: 31,
    });
    expect(replenishmentPeriod('LAST_YEAR_2', NOW)).toEqual({
      from: '2024-09-01T00:00:00.000Z',
      to: '2024-10-01T00:00:00.000Z',
      days: 30,
    });
    expect(replenishmentPeriod('LAST_YEAR_3', NOW).from).toBe('2024-10-01T00:00:00.000Z');
    expect(replenishmentPeriod('LAST_YEAR_QUARTER', NOW)).toEqual({
      from: '2024-08-01T00:00:00.000Z',
      to: '2024-11-01T00:00:00.000Z',
      days: 92,
    });
  });
});

describe('replenishmentGraph', () => {
  it('15 out over the last 30 days, min 10, max 50', () => {
    expect(
      replenishmentGraph({
        quantityOut: 15,
        quantityReturned: 0,
        periodDays: 31,
        percentFactor: 100,
        productMinQty: 10,
        productMaxQty: 50,
        digits: 2,
      }),
    ).toEqual({
      productMaxQty: 50,
      dailyDemand: 0.48,
      averageStock: 30,
      orderingPeriod: 82,
      curve: [50, 10, 50, 10, 50, 10],
    });
  });

  it('the same 15 over the last 7 days at 200 %, min 20, max 40', () => {
    expect(
      replenishmentGraph({
        quantityOut: 15,
        quantityReturned: 0,
        periodDays: 7,
        percentFactor: 200,
        productMinQty: 20,
        productMaxQty: 40,
        digits: 2,
      }),
    ).toEqual({
      productMaxQty: 40,
      dailyDemand: 4.29,
      averageStock: 30,
      orderingPeriod: 4,
      curve: [40, 20, 40, 20, 40, 20],
    });
  });

  it('a second 15 out in the same week doubles the demand', () => {
    expect(
      replenishmentGraph({
        quantityOut: 30,
        quantityReturned: 0,
        periodDays: 7,
        percentFactor: 200,
        productMinQty: 20,
        productMaxQty: 40,
        digits: 2,
      }),
    ).toEqual({
      productMaxQty: 40,
      dailyDemand: 8.57,
      averageStock: 30,
      orderingPeriod: 2,
      curve: [40, 20, 40, 20, 40, 20],
    });
  });

  it('no demand: no ordering period and no curve', () => {
    expect(
      replenishmentGraph({
        quantityOut: 5,
        quantityReturned: 5,
        periodDays: 31,
        percentFactor: 100,
        productMinQty: 10,
        productMaxQty: 50,
        digits: 2,
      }),
    ).toEqual({ productMaxQty: 50, dailyDemand: 0, averageStock: 30, orderingPeriod: 0, curve: [] });
  });

  it('a max below min is raised to min, and a flat line still orders every 1 / demand days', () => {
    expect(
      replenishmentGraph({
        quantityOut: 15,
        quantityReturned: 0,
        periodDays: 31,
        percentFactor: 100,
        productMinQty: 20,
        productMaxQty: 10,
        digits: 2,
      }),
    ).toEqual({
      productMaxQty: 20,
      dailyDemand: 0.48,
      averageStock: 20,
      orderingPeriod: 2,
      curve: [20, 20, 20, 20, 20, 20],
    });
  });
});

describe('leadDaysLines', () => {
  it('lists the lines last first, as the pop-up shows them', () => {
    expect(
      leadDaysLines([
        { label: 'Delay on Vendors → Stock', value: '+ 9 day(s)' },
        { label: 'Time Horizon', value: '+ 365 day(s)' },
      ]),
    ).toEqual([
      { label: 'Time Horizon', value: '+ 365 day(s)' },
      { label: 'Delay on Vendors → Stock', value: '+ 9 day(s)' },
    ]);
  });
});

describe('resupplyOptions', () => {
  it('sorts by free quantity, highest first, and flags the ones that cannot cover the order', () => {
    expect(
      resupplyOptions(
        [
          { routeId: 'from-wh3', freeQty: 2 },
          { routeId: 'from-wh1', freeQty: 40 },
          { routeId: 'from-wh2', freeQty: 10 },
        ],
        10,
      ),
    ).toEqual([
      { routeId: 'from-wh1', freeQty: 40, tooLow: false },
      { routeId: 'from-wh2', freeQty: 10, tooLow: false },
      { routeId: 'from-wh3', freeQty: 2, tooLow: true },
    ]);
  });

  it('keeps the route order for equal free quantities', () => {
    expect(
      resupplyOptions(
        [
          { routeId: 'first', freeQty: 5 },
          { routeId: 'second', freeQty: 5 },
        ],
        0,
      ).map((option) => option.routeId),
    ).toEqual(['first', 'second']);
  });
});

describe('planMinMaxSave', () => {
  it('saves min and max as typed when min is not above max', () => {
    expect(planMinMaxSave({ productMinQty: 10, productMaxQty: 50 })).toEqual({
      kind: 'write',
      data: { productMinQty: 10, productMaxQty: 50 },
    });
    expect(planMinMaxSave({ productMinQty: 20, productMaxQty: 20 })).toEqual({
      kind: 'write',
      data: { productMinQty: 20, productMaxQty: 20 },
    });
  });

  it('a max left at 0 is raised to min', () => {
    expect(planMinMaxSave({ productMinQty: 5, productMaxQty: 0 })).toEqual({
      kind: 'write',
      data: { productMinQty: 5, productMaxQty: 5 },
    });
  });

  it('refuses a max typed below min', () => {
    expect(planMinMaxSave({ productMinQty: 15, productMaxQty: 10 })).toEqual({ kind: 'refused' });
  });
});
