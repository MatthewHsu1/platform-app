import { readExpiryTimes } from 'src/product-expiry/read-expiry-times';
import { isLotExpired, planLotDates } from 'src/product-expiry/utils/lot-dates.util';
import { translate } from 'src/shared/i18n/translate';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { addNote } from 'src/shared/triggers/put-back';
import { retryOnConflict } from 'src/shared/triggers/retry-on-conflict';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { distinctIds } from 'src/shared/utils/distinct-ids.util';
import { stockLots } from 'src/stock/lot/lot-records';
import { readValidateLinesById } from 'src/stock/lot/validate/read-validate-lines';
import { hasPickingNote } from 'src/stock/picking/has-picking-note';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines } from 'src/stock/stock-records';
import { lotKey, planLotsAtValidate } from 'src/stock/utils/plan-lots-at-validate.util';
import { type ExpiryTimes } from 'src/product-expiry/utils/types/expiry-times.type';
import { type AssignLotsStore } from 'src/stock/lot/types/assign-lots-store.type';

export const LOTS_MISSING_NOTE = 'Done without a Lot/Serial number for products {products}: the lot was missing when the transfer was validated.';

// Safe to run again after a stop: lines that have their lot are skipped, a lot made by the stopped run is
// found by its name (or by its id, which depends only on its first line and name), and a lot another receipt
// made meanwhile trips the unique name and is read on the retry. A lot in the trash with the name is brought
// back, since its name is still taken. The run is past refusing here: a line still without a lot when its
// lot was required is done as it is, with a note on its transfer.
export const makeAssignLotsAtValidate = (store: AssignLotsStore) => async (lineIds: string[]) => {
  if (lineIds.length === 0) {
    return;
  }
  await retryOnConflict(async () => {
    const lines = (await store.readLines(lineIds)).filter((line) => line.state !== MOVE_STATE.DONE && line.lotId === null);
    const names = distinctIds(lines.map((line) => line.lotName));
    const existing = names.length === 0 ? [] : await store.findLots(distinctIds(lines.map((line) => line.productId)), names);
    const plan = planLotsAtValidate(lines, new Map(existing.map((lot) => [lotKey(lot.productId, lot.name), lot.id])));
    // The lookup pairs every product with every name; only a lot a line takes is brought back.
    const taken = new Set(plan.assign.map((entry) => entry.lotId));
    const trashed = existing.filter((lot) => lot.deletedAt !== null && taken.has(lot.id)).map((lot) => lot.id);

    if (trashed.length > 0) {
      await store.restoreLots(trashed);
    }
    const created = plan.create.map((lot) => ({
      id: derivedId('lotAtValidate', [...lot.lineIds].sort()[0], lot.productId, lot.name),
      lot,
    }));
    const times = created.length === 0 ? new Map<string, ExpiryTimes>() : await store.readExpiryTimes(created.map(({ lot }) => lot.productId));
    const now = store.now();

    await store.createMissingLots(
      created.map(({ id, lot }) => {
        // The lot is made with all its dates, so the lot rules find nothing left to date.
        const typed = { expirationDate: lot.expirationDate, useDate: null, removalDate: null, alertDate: null };
        const dates = { ...typed, ...planLotDates({ event: 'created', product: times.get(lot.productId) ?? null, before: null, after: typed, now }) };

        return {
          id,
          data: {
            productId: lot.productId,
            name: lot.name,
            ...Object.fromEntries(Object.entries(dates).filter(([, value]) => value !== null)),
            productExpiryAlert: isLotExpired(dates.expirationDate, now),
          },
        };
      }),
    );
    for (const { lineId, lotId } of plan.assign) {
      await store.pointLines([lineId], lotId);
    }
    for (const { id, lot } of created) {
      await store.pointLines(lot.lineIds, id);
    }

    const missing = lines.filter((line) => plan.missingLineIds.includes(line.id));

    for (const pickingId of distinctIds(missing.map((line) => line.pickingId))) {
      await store.noteLotsMissing(
        pickingId,
        distinctIds(missing.filter((line) => line.pickingId === pickingId).map((line) => line.productName)),
      );
    }
  });
};

export const assignLotsAtValidate = makeAssignLotsAtValidate({
  readLines: readValidateLinesById,
  findLots: (productIds, names) =>
    stockLots.findIncludingDeleted<{ id: string; name: string; productId: string; deletedAt: string | null }>(
      { productId: { in: productIds }, name: { in: names } },
      'id name productId deletedAt',
    ),
  restoreLots: async (lotIds) => {
    await stockLots.restoreMany(lotIds);
  },
  createMissingLots: async (rows) => {
    await createMissingRows(stockLots, rows);
  },
  readExpiryTimes,
  now: () => new Date(),
  pointLines: (lineIds, lotId) => stockMoveLines.updateMany(lineIds, { lotId }),
  // The note's title is its text, so a rerun after a stop finds it and does not add it twice.
  noteLotsMissing: async (pickingId, productNames) => {
    const text = translate(null, LOTS_MISSING_NOTE, { products: productNames.join(', ') });

    if (!(await hasPickingNote(pickingId, text))) {
      await addNote({ objectSingular: 'stockPicking', recordId: pickingId, title: text, body: text });
    }
  },
});
