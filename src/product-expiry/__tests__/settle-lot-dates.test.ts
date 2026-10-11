import { type ObjectRecordEvent } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { makeSettleLotDates } from 'src/product-expiry/settle-lot-dates';
import { type SettleLotDatesStore } from 'src/product-expiry/types/settle-lot-dates-store.type';
import { type LotEventRecord } from 'src/stock/lot/types/lot-event-record.type';

const now = new Date('2025-03-10T09:00:00.000Z');
const apple = { useExpirationDate: true, expirationTime: 10, useTime: 5, removalTime: 2, alertTime: 6 };

const lot = (fields: Partial<LotEventRecord> = {}): LotEventRecord => ({
  id: 'lot1',
  name: 'Apple Box #1',
  productId: 'apple',
  locationId: null,
  expirationDate: null,
  useDate: null,
  removalDate: null,
  alertDate: null,
  updatedBy: { source: 'MANUAL' },
  ...fields,
});

const created = (after: LotEventRecord) =>
  ({ recordId: after.id, properties: { after } }) as unknown as ObjectRecordEvent<LotEventRecord>;

const updated = (before: LotEventRecord, after: LotEventRecord) =>
  ({ recordId: after.id, properties: { before, after } }) as unknown as ObjectRecordEvent<LotEventRecord>;

const fakeStore = (stored: LotEventRecord[]) => {
  const writes: { id: string; data: Record<string, unknown> }[] = [];
  const flagged: string[][] = [];
  const copied: string[][] = [];
  const recomputed: string[][] = [];
  const store: SettleLotDatesStore = {
    readLots: async (ids) => stored.filter((row) => ids.includes(row.id)),
    readExpiryTimes: async () => new Map([['apple', apple]]),
    updateLot: async (id, data) => {
      writes.push({ id, data });
    },
    recomputeLotExpiry: async (ids) => {
      flagged.push(ids);
    },
    syncLotDateCopies: async (ids) => {
      copied.push(ids);
    },
    recomputeProductQuantities: async (ids) => {
      recomputed.push(ids);
    },
    now: () => now,
  };

  return { store, writes, flagged, copied, recomputed };
};

const dated = lot({
  expirationDate: '2025-03-20T09:00:00.000Z',
  useDate: '2025-03-15T09:00:00.000Z',
  removalDate: '2025-03-18T09:00:00.000Z',
  alertDate: '2025-03-14T09:00:00.000Z',
});

describe('settleLotDates', () => {
  it('dates a new lot from its product, then sets its expired flag and copies its dates', async () => {
    const fake = fakeStore([lot()]);

    await makeSettleLotDates(fake.store)('created', [created(lot())]);

    expect(fake.writes).toEqual([
      {
        id: 'lot1',
        data: {
          expirationDate: '2025-03-20T09:00:00.000Z',
          useDate: '2025-03-15T09:00:00.000Z',
          removalDate: '2025-03-18T09:00:00.000Z',
          alertDate: '2025-03-14T09:00:00.000Z',
        },
      },
    ]);
    expect(fake.flagged).toEqual([['lot1']]);
    expect(fake.copied).toEqual([['lot1']]);
    expect(fake.recomputed).toEqual([]);
  });

  it('moves every date with an expiration date a user moved 20 days later', async () => {
    const moved = { ...dated, expirationDate: '2025-04-09T09:00:00.000Z' };
    const fake = fakeStore([moved]);

    await makeSettleLotDates(fake.store)('updated', [updated(dated, moved)]);

    expect(fake.writes).toEqual([
      {
        id: 'lot1',
        data: { useDate: '2025-04-04T09:00:00.000Z', removalDate: '2025-04-07T09:00:00.000Z', alertDate: '2025-04-03T09:00:00.000Z' },
      },
    ]);
    expect(fake.copied).toEqual([['lot1']]);
    expect(fake.recomputed).toEqual([]);
  });

  it('recomputes the product quantities when a removal date a user typed puts the stock past its removal', async () => {
    const removed = { ...dated, removalDate: '2025-03-01T00:00:00.000Z' };
    const fake = fakeStore([removed]);

    await makeSettleLotDates(fake.store)('updated', [updated(dated, removed)]);

    expect(fake.writes).toEqual([]);
    expect(fake.copied).toEqual([['lot1']]);
    expect(fake.recomputed).toEqual([['apple']]);
  });

  it('recomputes the product quantities when a moved expiration date shifts the removal date into the past', async () => {
    const earlier = { ...dated, expirationDate: '2025-03-05T09:00:00.000Z' };
    const fake = fakeStore([earlier]);

    await makeSettleLotDates(fake.store)('updated', [updated(dated, earlier)]);

    expect(fake.writes[0]?.data.removalDate).toBe('2025-03-03T09:00:00.000Z');
    expect(fake.recomputed).toEqual([['apple']]);
  });

  it('plans a lot once from its first and last state when one batch holds two saves of it', async () => {
    const moved = { ...dated, expirationDate: '2025-04-09T09:00:00.000Z' };
    const typedRemoval = { ...moved, removalDate: '2025-04-01T00:00:00.000Z' };
    const fake = fakeStore([typedRemoval]);

    await makeSettleLotDates(fake.store)('updated', [updated(dated, moved), updated(moved, typedRemoval)]);

    expect(fake.writes).toEqual([{ id: 'lot1', data: { useDate: '2025-04-04T09:00:00.000Z', alertDate: '2025-04-03T09:00:00.000Z' } }]);
    expect(fake.flagged).toEqual([['lot1']]);
    expect(fake.copied).toEqual([['lot1']]);
  });

  it('does not answer the dates the app wrote itself', async () => {
    const written = { ...dated, expirationDate: '2025-04-09T09:00:00.000Z', updatedBy: { source: 'APPLICATION' } };
    const fake = fakeStore([written]);

    await makeSettleLotDates(fake.store)('updated', [updated(dated, written)]);

    expect([fake.writes, fake.flagged, fake.copied, fake.recomputed]).toEqual([[], [], [], []]);
  });

  it('leaves the dates of a lot whose product change was put back', async () => {
    const fake = fakeStore([dated]);

    await makeSettleLotDates(fake.store)('updated', [updated(dated, { ...dated, productId: 'pear' })]);

    expect([fake.writes, fake.flagged, fake.copied, fake.recomputed]).toEqual([[], [], [], []]);
  });
});
