import { type ObjectRecordEvent } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { makeSettleMoveLineDates } from 'src/product-expiry/settle-move-line-dates';
import { type DatedMoveLine } from 'src/product-expiry/types/dated-move-line.type';
import { type SettleMoveLineDatesStore } from 'src/product-expiry/types/settle-move-line-dates-store.type';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';

const today = new Date('2025-03-10T15:00:00.000Z');
const apple = { useExpirationDate: true, expirationTime: 10, useTime: 5, removalTime: 2, alertTime: 6 };
const pear = { useExpirationDate: false, expirationTime: 0, useTime: 0, removalTime: 0, alertTime: 0 };
const lotOne = { expirationDate: '2025-03-25T00:00:00.000Z', removalDate: '2025-03-23T00:00:00.000Z' };
const lotTwo = { expirationDate: '2025-04-05T00:00:00.000Z', removalDate: '2025-04-03T00:00:00.000Z' };

const line = (fields: Partial<DatedMoveLine> = {}): DatedMoveLine => ({
  id: 'line1',
  state: 'ASSIGNED',
  lotId: null,
  productId: 'apple',
  pickingId: 'receipt',
  expirationDate: null,
  removalDate: null,
  lot: null,
  usesCreateLots: true,
  scheduledDate: '2025-03-10T08:00:00.000Z',
  ...fields,
});

const lineEvent = (before: Partial<MoveLineEventRecord> | undefined, after: Partial<MoveLineEventRecord>, id = 'line1') =>
  ({
    recordId: id,
    properties: before === undefined ? { after } : { before, after },
  }) as unknown as ObjectRecordEvent<MoveLineEventRecord>;

const pickingEvent = (before: Partial<PickingEventRecord>, after: Partial<PickingEventRecord>) =>
  ({ recordId: 'receipt', properties: { before, after } }) as unknown as ObjectRecordEvent<PickingEventRecord>;

const fakeStore = (stored: DatedMoveLine[]) => {
  const writes: { id: string; data: Record<string, unknown> }[] = [];
  const store: SettleMoveLineDatesStore = {
    readLines: async (ids) => stored.filter((row) => ids.includes(row.id)),
    readTransferLines: async (pickingIds) =>
      stored.filter((row) => row.pickingId !== null && pickingIds.includes(row.pickingId)),
    readLotLines: async (lotIds) => stored.filter((row) => row.lotId !== null && lotIds.includes(row.lotId)),
    readExpiryTimes: async () =>
      new Map([
        ['apple', apple],
        ['pear', pear],
      ]),
    writeLines: async (updates) => {
      writes.push(...updates);
    },
    now: () => today,
  };

  return { store, writes };
};

describe('makeSettleMoveLineDates', () => {
  it('dates a line the app makes when it reserves a lot', async () => {
    const { store, writes } = fakeStore([line({ lotId: 'lot1', lot: lotOne, usesCreateLots: false, pickingId: 'delivery' })]);

    await makeSettleMoveLineDates(store).settleLineEventDates('created', [
      lineEvent(undefined, { lotId: 'lot1', updatedBy: { source: 'APPLICATION' } }),
    ]);

    expect(writes).toEqual([{ id: 'line1', data: lotOne }]);
  });

  it('gives a done line the dates of a lot picked on it, and leaves a cancelled line as it was', async () => {
    const { store, writes } = fakeStore([
      line({ id: 'done', state: 'DONE', lotId: 'lot1', lot: lotOne }),
      line({ id: 'cancelled', state: 'CANCEL', lotId: 'lot1', lot: lotOne }),
    ]);

    await makeSettleMoveLineDates(store).settleLineEventDates('updated', [
      lineEvent({ lotId: null, productId: 'apple', pickingId: 'receipt' }, { lotId: 'lot1', productId: 'apple', pickingId: 'receipt' }, 'done'),
      lineEvent(
        { lotId: null, productId: 'apple', pickingId: 'receipt' },
        { lotId: 'lot1', productId: 'apple', pickingId: 'receipt' },
        'cancelled',
      ),
    ]);

    expect(writes).toEqual([{ id: 'done', data: lotOne }]);
  });

  it('writes nothing for a lot change the line no longer shows', async () => {
    const { store, writes } = fakeStore([
      line({ lotId: 'lot1', lot: lotOne, expirationDate: '2025-03-20T08:00:00.000Z', removalDate: '2025-03-15T00:00:00.000Z' }),
    ]);

    await makeSettleMoveLineDates(store).settleLineEventDates('updated', [
      lineEvent({ lotId: 'lot1', productId: 'apple', pickingId: 'receipt' }, { lotId: 'lot2', productId: 'apple', pickingId: 'receipt' }),
    ]);

    expect(writes).toEqual([]);
  });

  it('works out several saves of one line in a batch once, from the lot it ends with', async () => {
    const { store, writes } = fakeStore([line({ lotId: 'lot2', lot: lotTwo })]);

    await makeSettleMoveLineDates(store).settleLineEventDates('updated', [
      lineEvent({ lotId: null, productId: 'apple', pickingId: 'receipt' }, { lotId: 'lot1', productId: 'apple', pickingId: 'receipt' }),
      lineEvent({ lotId: 'lot1', productId: 'apple', pickingId: 'receipt' }, { lotId: 'lot2', productId: 'apple', pickingId: 'receipt' }),
    ]);

    expect(writes).toEqual([{ id: 'line1', data: lotTwo }]);
  });

  it("dates a rescheduled receipt's lines from the new scheduled date and works their removal dates out again", async () => {
    const { store, writes } = fakeStore([
      line({ id: 'undated', scheduledDate: '2025-04-01T00:00:00.000Z' }),
      line({
        id: 'typed',
        scheduledDate: '2025-04-01T00:00:00.000Z',
        expirationDate: '2025-03-25T00:00:00.000Z',
        removalDate: '2025-03-20T00:00:00.000Z',
      }),
    ]);

    await makeSettleMoveLineDates(store).settleTransferEventDates('updated', [
      pickingEvent(
        { scheduledDate: '2025-03-10T08:00:00.000Z', updatedBy: { source: 'APPLICATION' } },
        { scheduledDate: '2025-04-01T00:00:00.000Z', updatedBy: { source: 'APPLICATION' } },
      ),
    ]);

    expect(writes).toEqual([
      { id: 'undated', data: { expirationDate: '2025-04-11T00:00:00.000Z', removalDate: '2025-04-09T00:00:00.000Z' } },
      { id: 'typed', data: { removalDate: '2025-03-23T00:00:00.000Z' } },
    ]);
  });

  it('leaves the lines alone when a transfer is saved with the same scheduled instant', async () => {
    const { store, writes } = fakeStore([line()]);

    await makeSettleMoveLineDates(store).settleTransferEventDates('updated', [
      pickingEvent({ scheduledDate: '2025-03-10T08:00:00Z' }, { scheduledDate: '2025-03-10T08:00:00.000Z' }),
    ]);

    expect(writes).toEqual([]);
  });

  it('clears the dates of a receipt line whose product changes to one without expiry', async () => {
    const { store, writes } = fakeStore([
      line({ productId: 'pear', expirationDate: '2025-03-20T08:00:00.000Z', removalDate: '2025-03-18T08:00:00.000Z' }),
    ]);

    await makeSettleMoveLineDates(store).settleLineEventDates('updated', [
      lineEvent({ lotId: null, productId: 'apple', pickingId: 'receipt' }, { lotId: null, productId: 'pear', pickingId: 'receipt' }),
    ]);

    expect(writes).toEqual([{ id: 'line1', data: { expirationDate: null, removalDate: null } }]);
  });

  it("dates a line moved to another receipt from that receipt's scheduled date", async () => {
    const { store, writes } = fakeStore([line({ pickingId: 'later', scheduledDate: '2025-04-01T00:00:00.000Z' })]);

    await makeSettleMoveLineDates(store).settleLineEventDates('updated', [
      lineEvent({ lotId: null, productId: 'apple', pickingId: 'receipt' }, { lotId: null, productId: 'apple', pickingId: 'later' }),
    ]);

    expect(writes).toEqual([
      { id: 'line1', data: { expirationDate: '2025-04-11T00:00:00.000Z', removalDate: '2025-04-09T00:00:00.000Z' } },
    ]);
  });

  it("follows a lot's new expiration date when the lot has no removal date: a receipt line removes the product's removal days before it, a done delivery line keeps its removal date", async () => {
    const newDates = { expirationDate: '2025-04-05T00:00:00.000Z', removalDate: null };
    const { store, writes } = fakeStore([
      line({ id: 'receipt', lotId: 'lot1', lot: newDates, expirationDate: lotOne.expirationDate, removalDate: lotOne.removalDate }),
      line({
        id: 'delivery',
        state: 'DONE',
        lotId: 'lot1',
        lot: newDates,
        usesCreateLots: false,
        pickingId: 'delivery',
        expirationDate: lotOne.expirationDate,
        removalDate: lotOne.removalDate,
      }),
      line({ id: 'cancelled', state: 'CANCEL', lotId: 'lot1', lot: newDates, expirationDate: lotOne.expirationDate }),
    ]);

    await makeSettleMoveLineDates(store).settleLotLineDates(['lot1']);

    expect(writes).toEqual([
      { id: 'receipt', data: { expirationDate: '2025-04-05T00:00:00.000Z', removalDate: '2025-04-03T00:00:00.000Z' } },
      { id: 'delivery', data: { expirationDate: '2025-04-05T00:00:00.000Z' } },
    ]);
  });
});
