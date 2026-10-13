import { describe, expect, it } from 'vitest';

import {
  isLotExpired,
  planLotDates,
  removalCrossedNow,
} from 'src/product-expiry/utils/lot-dates.util';
import { type LotDateFields } from 'src/product-expiry/utils/types/lot-date-fields.type';

// A lot-tracked product that expires 10 days after its lot is made: best before 5 days, removal 2 days and the
// alert 6 days before that.
const apple = { useExpirationDate: true, expirationTime: 10, useTime: 5, removalTime: 2, alertTime: 6 };
const now = new Date('2025-03-10T09:00:00.000Z');
const empty: LotDateFields = { expirationDate: null, useDate: null, removalDate: null, alertDate: null };

describe('planLotDates', () => {
  it('dates a new lot from now and the product days', () => {
    expect(planLotDates({ event: 'created', product: apple, before: null, after: empty, now })).toEqual({
      expirationDate: '2025-03-20T09:00:00.000Z',
      useDate: '2025-03-15T09:00:00.000Z',
      removalDate: '2025-03-18T09:00:00.000Z',
      alertDate: '2025-03-14T09:00:00.000Z',
    });
  });

  it('builds the other dates from an expiration date given on the receipt', () => {
    expect(
      planLotDates({ event: 'created', product: apple, before: null, after: { ...empty, expirationDate: '2025-04-09T09:00:00.000Z' }, now }),
    ).toEqual({
      useDate: '2025-04-04T09:00:00.000Z',
      removalDate: '2025-04-07T09:00:00.000Z',
      alertDate: '2025-04-03T09:00:00.000Z',
    });
  });

  it('keeps an expiration date given on the receipt when the product has no expiration days, and removes on that date', () => {
    expect(
      planLotDates({
        event: 'created',
        product: { ...apple, expirationTime: 0, removalTime: 0 },
        before: null,
        after: { ...empty, expirationDate: '2025-04-09T09:00:00.000Z' },
        now,
      }),
    ).toEqual({
      useDate: '2025-04-04T09:00:00.000Z',
      removalDate: '2025-04-09T09:00:00.000Z',
      alertDate: '2025-04-03T09:00:00.000Z',
    });
  });

  it('puts every date on the expiration date when the product days are 0', () => {
    const zero = { ...apple, useTime: 0, removalTime: 0, alertTime: 0 };

    expect(planLotDates({ event: 'created', product: zero, before: null, after: empty, now })).toEqual({
      expirationDate: '2025-03-20T09:00:00.000Z',
      useDate: '2025-03-20T09:00:00.000Z',
      removalDate: '2025-03-20T09:00:00.000Z',
      alertDate: '2025-03-20T09:00:00.000Z',
    });
  });

  it('keeps dates typed on a new lot of a product without expiry', () => {
    expect(
      planLotDates({
        event: 'created',
        product: { ...apple, useExpirationDate: false },
        before: null,
        after: { ...empty, alertDate: '2025-02-23T00:00:00.000Z' },
        now,
      }),
    ).toEqual({});
  });

  it('shifts every date with the expiration date', () => {
    const created: LotDateFields = {
      expirationDate: '2025-03-20T09:00:00.000Z',
      useDate: '2025-03-15T09:00:00.000Z',
      removalDate: '2025-03-18T09:00:00.000Z',
      alertDate: '2025-03-14T09:00:00.000Z',
    };

    expect(
      planLotDates({ event: 'expirationChanged', product: apple, before: created, after: { ...created, expirationDate: '2025-04-09T09:00:00.000Z' }, now }),
    ).toEqual({
      useDate: '2025-04-04T09:00:00.000Z',
      removalDate: '2025-04-07T09:00:00.000Z',
      alertDate: '2025-04-03T09:00:00.000Z',
    });
  });

  it('leaves an empty date empty when it shifts the others', () => {
    const dated: LotDateFields = {
      expirationDate: '2025-03-20T09:00:00.000Z',
      useDate: null,
      removalDate: '2025-03-18T09:00:00.000Z',
      alertDate: '2025-03-14T09:00:00.000Z',
    };

    expect(
      planLotDates({ event: 'expirationChanged', product: apple, before: dated, after: { ...dated, expirationDate: '2025-03-25T09:00:00.000Z' }, now }),
    ).toEqual({
      removalDate: '2025-03-23T09:00:00.000Z',
      alertDate: '2025-03-19T09:00:00.000Z',
    });
  });

  it('keeps a date typed in the same save as the expiration date and shifts the others', () => {
    const created: LotDateFields = {
      expirationDate: '2025-03-20T09:00:00.000Z',
      useDate: '2025-03-15T09:00:00.000Z',
      removalDate: '2025-03-18T09:00:00.000Z',
      alertDate: '2025-03-14T09:00:00.000Z',
    };

    expect(
      planLotDates({
        event: 'expirationChanged',
        product: apple,
        before: created,
        after: { ...created, expirationDate: '2025-04-09T09:00:00.000Z', removalDate: '2025-04-01T00:00:00.000Z' },
        typedFields: ['expirationDate', 'removalDate'],
        now,
      }),
    ).toEqual({
      useDate: '2025-04-04T09:00:00.000Z',
      alertDate: '2025-04-03T09:00:00.000Z',
    });
  });

  it('keeps a date typed in the same save when it rebuilds the others', () => {
    const typed: LotDateFields = { ...empty, expirationDate: '2025-04-09T09:00:00.000Z', alertDate: '2025-04-08T00:00:00.000Z' };

    expect(
      planLotDates({ event: 'expirationChanged', product: apple, before: empty, after: typed, typedFields: ['expirationDate', 'alertDate'], now }),
    ).toEqual({
      useDate: '2025-04-04T09:00:00.000Z',
      removalDate: '2025-04-07T09:00:00.000Z',
    });
  });

  it('keeps an expiration date typed with a new product and builds the other dates from it', () => {
    const dated: LotDateFields = { expirationDate: '2025-01-01T00:00:00.000Z', useDate: null, removalDate: null, alertDate: null };

    expect(
      planLotDates({
        event: 'productChanged',
        product: apple,
        before: dated,
        after: { ...dated, expirationDate: '2025-04-09T09:00:00.000Z' },
        typedFields: ['expirationDate'],
        now,
      }),
    ).toEqual({
      useDate: '2025-04-04T09:00:00.000Z',
      removalDate: '2025-04-07T09:00:00.000Z',
      alertDate: '2025-04-03T09:00:00.000Z',
    });
  });

  it('rebuilds the dates when they were all cleared and an expiration date is set again', () => {
    expect(
      planLotDates({ event: 'expirationChanged', product: apple, before: empty, after: { ...empty, expirationDate: '2025-04-09T09:00:00.000Z' }, now }),
    ).toEqual({
      useDate: '2025-04-04T09:00:00.000Z',
      removalDate: '2025-04-07T09:00:00.000Z',
      alertDate: '2025-04-03T09:00:00.000Z',
    });
  });

  it('leaves the other dates as they are when the expiration date is cleared', () => {
    const dated: LotDateFields = {
      expirationDate: '2025-03-20T09:00:00.000Z',
      useDate: '2025-03-15T09:00:00.000Z',
      removalDate: '2025-03-18T09:00:00.000Z',
      alertDate: '2025-03-14T09:00:00.000Z',
    };

    expect(planLotDates({ event: 'expirationChanged', product: apple, before: dated, after: { ...dated, expirationDate: null }, now })).toEqual({});
  });

  it('clears the other dates on a product without expiry', () => {
    const typed: LotDateFields = { expirationDate: null, useDate: 'x', removalDate: 'y', alertDate: 'z' };

    expect(
      planLotDates({
        event: 'expirationChanged',
        product: { ...apple, useExpirationDate: false },
        before: typed,
        after: { ...typed, expirationDate: '2025-04-09T09:00:00.000Z' },
        now,
      }),
    ).toEqual({ useDate: null, removalDate: null, alertDate: null });
  });

  it('dates the lot again for its new product', () => {
    const dated: LotDateFields = { expirationDate: '2025-01-01T00:00:00.000Z', useDate: null, removalDate: null, alertDate: null };

    expect(planLotDates({ event: 'productChanged', product: { ...apple, useExpirationDate: false }, before: dated, after: dated, now })).toEqual({
      expirationDate: null,
    });
    expect(planLotDates({ event: 'productChanged', product: apple, before: dated, after: dated, now })).toEqual({
      expirationDate: '2025-03-20T09:00:00.000Z',
      useDate: '2025-03-15T09:00:00.000Z',
      removalDate: '2025-03-18T09:00:00.000Z',
      alertDate: '2025-03-14T09:00:00.000Z',
    });
  });

  it('writes nothing when a stored date is the same instant written another way', () => {
    const stored: LotDateFields = {
      expirationDate: '2025-03-20T09:00:00Z',
      useDate: '2025-03-15T09:00:00Z',
      removalDate: '2025-03-18T09:00:00Z',
      alertDate: '2025-03-14T09:00:00Z',
    };

    expect(planLotDates({ event: 'created', product: apple, before: null, after: stored, now })).toEqual({});
  });
});

describe('isLotExpired', () => {
  it('is true once the expiration date is reached', () => {
    expect(isLotExpired('2025-03-10T09:00:00.000Z', now)).toBe(true);
    expect(isLotExpired('2025-03-11T00:00:00.000Z', now)).toBe(false);
    expect(isLotExpired(null, now)).toBe(false);
  });
});

describe('removalCrossedNow', () => {
  const at = new Date('2025-03-10T12:00:00.000Z');

  it('is true when a removal date moves across the current time', () => {
    expect(removalCrossedNow('2025-03-20T00:00:00.000Z', '2025-03-01T00:00:00.000Z', at)).toBe(true);
    expect(removalCrossedNow(null, '2025-03-01T00:00:00.000Z', at)).toBe(true);
    expect(removalCrossedNow('2025-03-01T00:00:00.000Z', null, at)).toBe(true);
    expect(removalCrossedNow('2025-03-10T08:00:00.000Z', '2025-03-25T00:00:00.000Z', at)).toBe(true);
    expect(removalCrossedNow('2025-03-20T00:00:00.000Z', '2025-03-10T13:00:00.000Z', at)).toBe(false);
    expect(removalCrossedNow('2025-03-20T00:00:00.000Z', '2025-03-25T00:00:00.000Z', at)).toBe(false);
  });
});
