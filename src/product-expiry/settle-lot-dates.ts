import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isStaffChange } from 'src/shared/triggers/actor';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readExpiryTimes } from 'src/product-expiry/read-expiry-times';
import { recomputeLotExpiry } from 'src/product-expiry/recompute-lot-expiry';
import { syncLotDateCopies } from 'src/product-expiry/sync-lot-date-copies';
import { freeQuantityCutoff } from 'src/product-expiry/utils/expiry-quantities.util';
import { planLotDates, removalCrossedNow } from 'src/product-expiry/utils/lot-dates.util';
import { stockLots } from 'src/stock/lot/lot-records';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { type SettleLotDatesStore } from 'src/product-expiry/types/settle-lot-dates-store.type';
import { type LotDateFields } from 'src/product-expiry/utils/types/lot-date-fields.type';
import { type LotDatesEvent } from 'src/product-expiry/utils/types/lot-dates-event.type';
import { type LotEventRecord } from 'src/stock/lot/types/lot-event-record.type';

type StoredLot = Awaited<ReturnType<SettleLotDatesStore['readLots']>>[number];
type DateChange = {
  lot: StoredLot;
  kind: LotDatesEvent | 'removalChanged';
  before: LotDateFields | null;
  typedFields: (keyof LotDateFields)[];
};

const DATE_FIELDS: (keyof LotDateFields)[] = ['expirationDate', 'useDate', 'removalDate', 'alertDate'];

const dateFields = (lot: LotDateFields): LotDateFields => ({
  expirationDate: lot.expirationDate,
  useDate: lot.useDate,
  removalDate: lot.removalDate,
  alertDate: lot.alertDate,
});

const sameInstant = (left: string | null, right: string | null) =>
  left === right || (left !== null && right !== null && Date.parse(left) === Date.parse(right));

// Several saves of one lot in a batch are planned once: from the state before the first save to the stored row, with
// every date any of those saves typed.
const changeOf = (operation: 'created' | 'updated', lot: StoredLot, events: ObjectRecordEvent<LotEventRecord>[]): DateChange[] => {
  if (operation === 'created') {
    return [{ lot, kind: 'created', before: null, typedFields: [] }];
  }
  const saves = events.flatMap((event) => {
    const before = eventBefore(event);
    const after = eventAfter(event);

    return before === undefined || after === undefined ? [] : [{ before, after }];
  });

  if (saves.length === 0) {
    return [];
  }
  const first = saves[0].before;
  const typedFields = DATE_FIELDS.filter((field) => saves.some(({ before, after }) => !sameInstant(before[field], after[field])));
  const productTyped = saves.some(({ before, after }) => before.productId !== after.productId);
  const before = dateFields(first);

  // A product change that was put back leaves the stored product as it was.
  if (productTyped && lot.productId !== first.productId) {
    return [{ lot, kind: 'productChanged', before, typedFields }];
  }
  if (typedFields.includes('expirationDate')) {
    return [{ lot, kind: 'expirationChanged', before, typedFields }];
  }
  return typedFields.includes('removalDate') ? [{ lot, kind: 'removalChanged', before, typedFields }] : [];
};

// A new lot, a user's change of its product, expiration date or removal date. The dates the app writes here do not
// come back as a user's change, so the copies on its quants and lines are made in the same pass.
export const makeSettleLotDates =
  (store: SettleLotDatesStore) => async (operation: 'created' | 'updated', events: ObjectRecordEvent<LotEventRecord>[]) => {
    const candidates = events.filter((event) => operation === 'created' || isStaffChange(operation, event, eventAfter(event)));

    if (candidates.length === 0) {
      return;
    }
    const eventsByLot = new Map<string, ObjectRecordEvent<LotEventRecord>[]>();

    for (const event of candidates) {
      eventsByLot.set(event.recordId, [...(eventsByLot.get(event.recordId) ?? []), event]);
    }
    const stored = await store.readLots([...eventsByLot.keys()]);
    const changes = stored.flatMap((lot) => changeOf(operation, lot, eventsByLot.get(lot.id) ?? []));

    if (changes.length === 0) {
      return;
    }
    const now = store.now();
    const times = await store.readExpiryTimes(changes.flatMap((change) => change.lot.productId ?? []));
    const productsToRecompute = new Set<string>();
    const errors = errorCollector();

    for (const { lot, kind, before, typedFields } of changes) {
      await errors.run(lot.id, async () => {
        const patch =
          kind === 'removalChanged'
            ? {}
            : planLotDates({
                event: kind,
                product: lot.productId === null ? null : (times.get(lot.productId) ?? null),
                before,
                after: dateFields(lot),
                typedFields,
                now,
              });

        if (Object.keys(patch).length > 0) {
          await store.updateLot(lot.id, patch);
        }
        const removalAfter = patch.removalDate === undefined ? lot.removalDate : patch.removalDate;

        if (lot.productId !== null && removalCrossedNow(before?.removalDate ?? null, removalAfter, freeQuantityCutoff(now))) {
          productsToRecompute.add(lot.productId);
        }
      });
    }
    const lotIds = changes.map((change) => change.lot.id);

    await errors.run('expired flags', () => store.recomputeLotExpiry(lotIds, now));
    await errors.run('date copies', () => store.syncLotDateCopies(lotIds));
    if (productsToRecompute.size > 0) {
      await errors.run('product quantities', () => store.recomputeProductQuantities([...productsToRecompute]));
    }
    errors.throwIfAny();
  };

export const settleLotDates = makeSettleLotDates({
  readLots: (ids) =>
    stockLots.find<StoredLot>({ id: { in: ids } }, 'id productId expirationDate useDate removalDate alertDate'),
  readExpiryTimes,
  updateLot: (id, data) => stockLots.update(id, data),
  recomputeLotExpiry,
  syncLotDateCopies,
  recomputeProductQuantities,
  now: () => new Date(),
});
