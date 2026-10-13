import { describe, expect, it } from 'vitest';

import {
  planDateDeadline,
  planHasDeadlineIssue,
  planPickingDelayAlertDate,
  planPickingValues,
  planScheduledDate,
} from 'src/stock/utils/plan-picking-values.util';

const NOW = '2026-10-08T12:00:00.000Z';
const OCT_10 = '2026-10-10T08:00:00.000Z';
const OCT_12 = '2026-10-12T08:00:00.000Z';
const OCT_15 = '2026-10-15T08:00:00.000Z';

describe('planScheduledDate', () => {
  const moves = [
    { state: 'CONFIRMED' as const, date: OCT_12 },
    { state: 'ASSIGNED' as const, date: OCT_10 },
    { state: 'DONE' as const, date: OCT_15 },
  ];

  it('DIRECT takes the earliest live move date', () => {
    expect(planScheduledDate({ moveType: 'DIRECT', moves, current: OCT_15, now: NOW })).toBe(OCT_10);
  });

  it('ONE takes the latest live move date', () => {
    expect(planScheduledDate({ moveType: 'ONE', moves, current: OCT_15, now: NOW })).toBe(OCT_12);
  });

  it('keeps the current date when no move is live, else now', () => {
    expect(planScheduledDate({ moveType: 'DIRECT', moves: [{ state: 'DONE', date: OCT_10 }], current: OCT_15, now: NOW })).toBe(OCT_15);
    expect(planScheduledDate({ moveType: 'DIRECT', moves: [], current: null, now: NOW })).toBe(NOW);
  });
});

describe('planDateDeadline', () => {
  const moves = [
    { state: 'DONE' as const, dateDeadline: OCT_10 },
    { state: 'CONFIRMED' as const, dateDeadline: OCT_15 },
    { state: 'CANCEL' as const, dateDeadline: '2026-10-01T08:00:00.000Z' },
    { state: 'CONFIRMED' as const, dateDeadline: null },
  ];

  it('DIRECT takes the earliest deadline of moves not cancelled', () => {
    expect(planDateDeadline({ moveType: 'DIRECT', moves })).toBe(OCT_10);
  });

  it('ONE takes the latest', () => {
    expect(planDateDeadline({ moveType: 'ONE', moves })).toBe(OCT_15);
  });

  it('is empty without deadlines', () => {
    expect(planDateDeadline({ moveType: 'DIRECT', moves: [{ state: 'CONFIRMED', dateDeadline: null }] })).toBeNull();
  });
});

describe('planHasDeadlineIssue and planPickingDelayAlertDate', () => {
  it('is late when the deadline is before the scheduled date', () => {
    expect(planHasDeadlineIssue({ dateDeadline: OCT_10, scheduledDate: OCT_12 })).toBe(true);
    expect(planHasDeadlineIssue({ dateDeadline: OCT_12, scheduledDate: OCT_12 })).toBe(false);
    expect(planHasDeadlineIssue({ dateDeadline: null, scheduledDate: OCT_12 })).toBe(false);
  });

  it('takes the latest delay alert date of the moves', () => {
    expect(planPickingDelayAlertDate([{ delayAlertDate: OCT_10 }, { delayAlertDate: OCT_12 }, { delayAlertDate: null }])).toBe(OCT_12);
    expect(planPickingDelayAlertDate([{ delayAlertDate: null }])).toBeNull();
  });
});

describe('planPickingValues', () => {
  it('puts the state and dates together', () => {
    expect(
      planPickingValues({
        picking: { moveType: 'DIRECT', state: 'DRAFT', scheduledDate: NOW },
        locationUsage: 'INTERNAL',
        moves: [
          {
            state: 'ASSIGNED',
            productUomQty: 2,
            procureMethod: 'MAKE_TO_STOCK',
            locationDestUsage: 'CUSTOMER',
            date: OCT_12,
            dateDeadline: OCT_10,
            delayAlertDate: null,
          },
        ],
        now: NOW,
      }),
    ).toEqual({ state: 'ASSIGNED', scheduledDate: OCT_12, dateDeadline: OCT_10, hasDeadlineIssue: true, delayAlertDate: null });
  });
});
