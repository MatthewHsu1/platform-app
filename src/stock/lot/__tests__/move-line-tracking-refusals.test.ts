import { type ObjectRecordEvent } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { translate } from 'src/shared/i18n/translate';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { makeHandleMoveLineTrackingRefusals } from 'src/stock/lot/rules/move-line-tracking-refusals';
import { type MoveLineTrackingRefusalStore } from 'src/stock/lot/types/move-line-tracking-refusal-store.type';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';

const row = (fields: Partial<MoveLineRow> = {}): MoveLineRow => ({
  id: 'l1',
  name: null,
  pickingId: 't1',
  moveId: 'm1',
  productId: 'bike',
  productUomId: 'unit',
  quantity: 1,
  quantityProductUom: 1,
  picked: false,
  date: null,
  ownerId: null,
  lotId: 'sn1',
  packageId: null,
  resultPackageId: null,
  locationId: 'stock',
  locationDestId: 'customers',
  state: 'ASSIGNED',
  createdAt: '2026-10-10T08:00:00.000Z',
  ...fields,
});

const staff = (record: MoveLineRow): MoveLineEventRecord => ({ ...record, updatedBy: { source: 'MANUAL' } });

const updated = (before: MoveLineRow, after: MoveLineRow, updatedFields: string[]) =>
  ({ recordId: after.id, properties: { before: staff(before), after: staff(after), updatedFields } }) as unknown as ObjectRecordEvent<MoveLineEventRecord>;

const created = (after: MoveLineRow) =>
  ({ recordId: after.id, properties: { after: staff(after) } }) as unknown as ObjectRecordEvent<MoveLineEventRecord>;

const fakeStore = (stored: MoveLineRow[]) => {
  const putBacks: { recordId: string; data: Record<string, unknown>; reason: string }[] = [];
  const destroyed: { recordId: string; noteOn: unknown; reason: string }[] = [];
  const store: MoveLineTrackingRefusalStore = {
    readLines: async (ids) => stored.filter((line) => ids.includes(line.id)),
    readLots: async (ids) =>
      [
        { id: 'sn1', name: 'SN1', productId: 'bike' },
        { id: 'other', name: 'L9', productId: 'wheel' },
      ].filter((lot) => ids.includes(lot.id)),
    readProducts: async () => new Map([['bike', { displayName: 'Bike', tracking: 'SERIAL' as const, uomId: 'unit' }]]),
    uoms: async () => new Map([['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }]]),
    digits: () => 2,
    putBack: async (event, data, refusal) => {
      putBacks.push({ recordId: event.recordId, data, reason: translate(null, refusal.message, refusal.values) });
    },
    destroyWithNote: async (event, noteOn, refusal) => {
      destroyed.push({ recordId: event.recordId, noteOn, reason: translate(null, refusal.message, refusal.values) });
    },
  };

  return { store, putBacks, destroyed };
};

describe('handleMoveLineTrackingRefusals', () => {
  it('puts back the whole refused save and keeps only that event from the other rules', async () => {
    const refusedSave = updated(row(), row({ quantity: 2, locationId: 'shelf' }), ['quantity', 'locationId', 'location']);
    const laterSave = updated(row({ quantity: 2, locationId: 'shelf' }), row({ quantity: 2, locationId: 'shelf', picked: true }), [
      'picked',
    ]);
    const { store, putBacks, destroyed } = fakeStore([row({ quantity: 2, locationId: 'shelf', picked: true })]);
    const errors = errorCollector();

    const refused = await makeHandleMoveLineTrackingRefusals(store)([refusedSave, laterSave], 'updated', errors);

    errors.throwIfAny();
    expect(putBacks).toEqual([
      {
        recordId: 'l1',
        data: { quantity: 1, locationId: 'stock' },
        reason: 'You can only process 1.0 Units of products with unique serial number.',
      },
    ]);
    expect(destroyed).toEqual([]);
    expect([refused.has(refusedSave), refused.has(laterSave)]).toEqual([true, false]);
  });

  it('destroys a new line naming a lot of another product, with a note on its transfer', async () => {
    const line = row({ lotId: 'other' });
    const event = created(line);
    const { store, putBacks, destroyed } = fakeStore([line]);

    const refused = await makeHandleMoveLineTrackingRefusals(store)([event], 'created', errorCollector());

    expect(destroyed).toEqual([
      { recordId: 'l1', noteOn: { objectSingular: 'stockPicking', recordId: 't1' }, reason: 'This lot L9 is incompatible with this product Bike' },
    ]);
    expect(putBacks).toEqual([]);
    expect(refused.has(event)).toBe(true);
  });

  it('leaves an edit alone when the row has changed again since', async () => {
    const event = updated(row(), row({ quantity: 2 }), ['quantity']);
    const { store, putBacks } = fakeStore([row({ quantity: 1 })]);

    const refused = await makeHandleMoveLineTrackingRefusals(store)([event], 'updated', errorCollector());

    expect(putBacks).toEqual([]);
    expect(refused.size).toBe(0);
  });

  it('never destroys a line for an edit whose earlier values are unknown', async () => {
    const after = row({ quantity: 2 });
    const event = { recordId: 'l1', properties: { after: staff(after), updatedFields: ['quantity'] } } as unknown as ObjectRecordEvent<MoveLineEventRecord>;
    const { store, putBacks, destroyed } = fakeStore([after]);

    await makeHandleMoveLineTrackingRefusals(store)([event], 'updated', errorCollector());

    expect([putBacks, destroyed]).toEqual([[], []]);
  });
});
