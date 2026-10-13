import { describe, expect, it } from 'vitest';

import { planMoveLineExpiryDates } from 'src/product-expiry/utils/move-line-expiry-dates.util';

const apple = { useExpirationDate: true, expirationTime: 10, removalTime: 2 };
const none = { created: false, lot: false, product: false, scheduledDate: false };
const today = new Date('2025-03-10T15:00:00.000Z');

describe('planMoveLineExpiryDates', () => {
  it('dates a new receipt line from the scheduled date', () => {
    expect(
      planMoveLineExpiryDates({
        changed: { ...none, created: true },
        lot: null,
        usesCreateLots: true,
        product: apple,
        current: { expirationDate: null, removalDate: null },
        scheduledDate: '2025-03-10T08:00:00.000Z',
        today,
      }),
    ).toEqual({ expirationDate: '2025-03-20T08:00:00.000Z', removalDate: '2025-03-18T08:00:00.000Z' });
  });

  it('dates from the start of today when the transfer has no scheduled date', () => {
    expect(
      planMoveLineExpiryDates({
        changed: { ...none, created: true },
        lot: null,
        usesCreateLots: true,
        product: apple,
        current: { expirationDate: null, removalDate: null },
        scheduledDate: null,
        today,
      }),
    ).toEqual({ expirationDate: '2025-03-20T00:00:00.000Z', removalDate: '2025-03-18T00:00:00.000Z' });
  });

  it("takes the picked lot's dates, and clears them for a lot without", () => {
    const current = { expirationDate: '2025-03-20T00:00:00.000Z', removalDate: '2025-03-18T00:00:00.000Z' };

    expect(
      planMoveLineExpiryDates({
        changed: { ...none, lot: true },
        lot: { expirationDate: '2025-03-25T00:00:00.000Z', removalDate: '2025-03-23T00:00:00.000Z' },
        usesCreateLots: true,
        product: apple,
        current,
        scheduledDate: null,
        today,
      }),
    ).toEqual({ expirationDate: '2025-03-25T00:00:00.000Z', removalDate: '2025-03-23T00:00:00.000Z' });
    expect(
      planMoveLineExpiryDates({
        changed: { ...none, lot: true },
        lot: { expirationDate: null, removalDate: null },
        usesCreateLots: true,
        product: apple,
        current,
        scheduledDate: null,
        today,
      }),
    ).toEqual({ expirationDate: null, removalDate: null });
  });

  it('keeps the date a line outside any transfer was made with until a lot is picked on it', () => {
    const made = { expirationDate: '2025-03-20T00:00:00.000Z', removalDate: null };
    const lineOutsideTransfer = { usesCreateLots: false, product: apple, scheduledDate: null, today };

    expect(planMoveLineExpiryDates({ ...lineOutsideTransfer, changed: { ...none, created: true }, lot: null, current: made })).toEqual({});
    expect(
      planMoveLineExpiryDates({
        ...lineOutsideTransfer,
        changed: { ...none, lot: true },
        lot: { expirationDate: '2025-03-25T00:00:00.000Z', removalDate: null },
        current: made,
      }),
    ).toEqual({ expirationDate: '2025-03-25T00:00:00.000Z' });
    expect(
      planMoveLineExpiryDates({
        ...lineOutsideTransfer,
        changed: { ...none, lot: true },
        lot: { expirationDate: null, removalDate: null },
        current: { expirationDate: '2025-03-25T00:00:00.000Z', removalDate: null },
      }),
    ).toEqual({ expirationDate: null });
  });

  it('leaves a delivery line without lot alone', () => {
    expect(
      planMoveLineExpiryDates({
        changed: { ...none, created: true },
        lot: null,
        usesCreateLots: false,
        product: apple,
        current: { expirationDate: null, removalDate: null },
        scheduledDate: null,
        today,
      }),
    ).toEqual({});
  });

  it('clears both dates for a product without expiry on a type that makes lots', () => {
    expect(
      planMoveLineExpiryDates({
        changed: { ...none, product: true },
        lot: null,
        usesCreateLots: true,
        product: { ...apple, useExpirationDate: false },
        current: { expirationDate: '2025-01-01T00:00:00.000Z', removalDate: '2024-12-30T00:00:00.000Z' },
        scheduledDate: null,
        today,
      }),
    ).toEqual({ expirationDate: null, removalDate: null });
  });

  it('keeps a removal date the line was made with', () => {
    expect(
      planMoveLineExpiryDates({
        changed: { ...none, created: true },
        lot: null,
        usesCreateLots: true,
        product: apple,
        current: { expirationDate: null, removalDate: '2025-03-15T00:00:00.000Z' },
        scheduledDate: '2025-03-10T08:00:00.000Z',
        today,
      }),
    ).toEqual({ expirationDate: '2025-03-20T08:00:00.000Z' });
  });

  it('keeps a typed removal date until the transfer is rescheduled, and fills a missing expiration date then', () => {
    const current = { expirationDate: '2025-03-25T00:00:00.000Z', removalDate: '2025-03-20T00:00:00.000Z' };

    expect(
      planMoveLineExpiryDates({ changed: none, lot: null, usesCreateLots: true, product: apple, current, scheduledDate: null, today }),
    ).toEqual({});
    expect(
      planMoveLineExpiryDates({
        changed: { ...none, scheduledDate: true },
        lot: null,
        usesCreateLots: true,
        product: apple,
        current,
        scheduledDate: '2025-04-01T00:00:00.000Z',
        today,
      }),
    ).toEqual({ removalDate: '2025-03-23T00:00:00.000Z' });
    expect(
      planMoveLineExpiryDates({
        changed: { ...none, scheduledDate: true },
        lot: null,
        usesCreateLots: true,
        product: apple,
        current: { expirationDate: null, removalDate: null },
        scheduledDate: '2025-04-01T00:00:00.000Z',
        today,
      }),
    ).toEqual({ expirationDate: '2025-04-11T00:00:00.000Z', removalDate: '2025-04-09T00:00:00.000Z' });
  });

  it('writes nothing when the line already shows the same instants', () => {
    expect(
      planMoveLineExpiryDates({
        changed: { ...none, lot: true },
        lot: { expirationDate: '2025-03-25T00:00:00.000Z', removalDate: '2025-03-23T00:00:00.000Z' },
        usesCreateLots: true,
        product: apple,
        current: { expirationDate: '2025-03-25T00:00:00Z', removalDate: '2025-03-23T00:00:00Z' },
        scheduledDate: null,
        today,
      }),
    ).toEqual({});
  });
});
