import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { addNote, putBack } from 'src/shared/triggers/put-back';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readLocations } from 'src/stock/location/read-locations';
import { applyDoneLineCorrection } from 'src/stock/move-line/done-line-correction';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { planDoneLineCorrection } from 'src/stock/utils/plan-done-line-correction.util';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';

const WATCHED = ['locationId', 'locationDestId', 'ownerId', 'lotId', 'packageId', 'resultPackageId', 'quantity', 'productUomId'] as const;
const CHANGE_PRODUCT_MESSAGE = "Changing the product is only allowed in 'Draft' state.";

// A staff edit of a line that was done corrects the stock by the difference, from the event's own
// before and after so edits add up in any order. A failed correction leaves a note instead of
// throwing: a retry of the batch would post the difference twice, and the nightly check repairs
// the key. Only a failure to write that note (or the put-back) reaches the error collector.
export const handleDoneLineEdits = async (
  events: ObjectRecordEvent<MoveLineEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const edits = events.flatMap((event) => {
    const before = 'before' in event.properties ? event.properties.before : undefined;
    const after = 'after' in event.properties ? event.properties.after : undefined;

    return before !== undefined &&
      after !== undefined &&
      before.state === MOVE_STATE.DONE &&
      !isApplicationWrite(after)
      ? [{ event, before, after }]
      : [];
  });

  if (edits.length === 0) {
    return;
  }
  const { productUnitDigits: digits } = readStockSettings();
  const [uoms, products, locations] = await Promise.all([
    readResolvedUoms(),
    readStockProducts([...new Set(edits.flatMap(({ before, after }) => [before.productId, after.productId]))]),
    readLocations([
      ...new Set(
        edits.flatMap(({ before, after }) =>
          [before.locationId, after.locationId, before.locationDestId, after.locationDestId].flatMap((id) => (id === null ? [] : [id])),
        ),
      ),
    ]),
  ]);
  const locationName = (id: string | null) => (id === null ? '' : locations.get(id)?.completeName ?? locations.get(id)?.name ?? id);

  for (const { event, before, after } of edits) {
    await errors.run(`Done line ${event.recordId}`, async () => {
      const locale = await readMemberLocale(event.workspaceMemberId).catch(() => 'en');

      if (before.productId !== after.productId) {
        await putBack({
          objectSingular: 'stockMoveLine',
          objectPlural: 'stockMoveLines',
          recordId: event.recordId,
          data: {
            productId: before.productId,
            ...Object.fromEntries(WATCHED.map((field) => [field, before[field]])),
          },
          reason: translate(locale, CHANGE_PRODUCT_MESSAGE),
        });
        return;
      }
      if (WATCHED.every((field) => (before[field] ?? null) === (after[field] ?? null))) {
        return;
      }
      const notCorrected = (reason: string) =>
        addNote({
          objectSingular: 'stockMoveLine',
          recordId: event.recordId,
          title: translate(locale, 'Stock not corrected'),
          body: translate(locale, 'The stock levels were not corrected for this change ({error}). The nightly check repairs them.', {
            error: reason,
          }),
        });
      const product = products.get(after.productId);

      if (product === undefined) {
        await notCorrected(translate(locale, 'The product was not found.'));
        return;
      }
      try {
        const inProductUnit = (row: MoveLineEventRecord) =>
          convertQuantity({
            qty: row.quantity,
            fromUomId: row.productUomId ?? product.uomId,
            toUomId: product.uomId,
            uoms,
            digits,
            method: 'HALF-UP',
          });
        const sideOf = (row: MoveLineEventRecord) => ({
          productId: row.productId,
          locationId: row.locationId ?? '',
          locationDestId: row.locationDestId ?? '',
          ownerId: row.ownerId,
          lotId: row.lotId,
          packageId: row.packageId ?? null,
          resultPackageId: row.resultPackageId ?? null,
          quantityProductUom: inProductUnit(row),
        });
        const afterSide = sideOf(after);
        const note = [
          translate(locale, 'A done operation of {product} was changed.', { product: product.displayName }),
          ...(before.quantity !== after.quantity || before.productUomId !== after.productUomId
            ? [translate(locale, 'Quantity: {old} → {new}', { old: before.quantity, new: after.quantity })]
            : []),
          ...(before.locationId !== after.locationId
            ? [translate(locale, 'Source location: {old} → {new}', { old: locationName(before.locationId), new: locationName(after.locationId) })]
            : []),
          ...(before.locationDestId !== after.locationDestId
            ? [
                translate(locale, 'Destination location: {old} → {new}', {
                  old: locationName(before.locationDestId),
                  new: locationName(after.locationDestId),
                }),
              ]
            : []),
          ...(before.ownerId !== after.ownerId ? [translate(locale, 'The owner changed.')] : []),
          ...((before.lotId ?? null) !== (after.lotId ?? null) ? [translate(locale, 'The lot or serial number changed.')] : []),
          ...((before.packageId ?? null) !== (after.packageId ?? null) || (before.resultPackageId ?? null) !== (after.resultPackageId ?? null)
            ? [translate(locale, 'The package changed.')]
            : []),
        ].join('\n');

        await applyDoneLineCorrection({
          lineId: event.recordId,
          // Each edit stamps a new update time; a second delivery of the same event carries the same one.
          editId: after.updatedAt ?? JSON.stringify(WATCHED.map((field) => after[field] ?? null)),
          moveId: after.moveId,
          pickingId: after.pickingId,
          productIds: [after.productId],
          plan: planDoneLineCorrection({
            before: sideOf(before),
            after: afterSide,
            storable: product.isStorable,
            digits,
          }),
          quantity: after.quantity,
          quantityProductUom: afterSide.quantityProductUom,
          note,
        });
      } catch (error) {
        await notCorrected(error instanceof Error ? error.message : String(error));
      }
    });
  }
};
