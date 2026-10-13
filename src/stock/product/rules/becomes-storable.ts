import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readLocations } from 'src/stock/location/read-locations';
import { recomputeTrackingForKeys } from 'src/stock/lot/recompute-tracking-for-keys';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { type ProductTemplateEventRecord } from 'src/stock/product/types/product-template-event-record.type';
import { applyInventory } from 'src/stock/quant/actions/apply-inventory';
import { applyQuantDelta } from 'src/stock/quant/apply-quant-delta';
import { sourceKeyOf } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { floatRound } from 'src/shared/utils/float-round.util';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { MOVE_STATE, OPEN_LINE_STATES } from 'src/stock/stock-options.constant';
import { productProducts, productTemplates, stockMoveLines, stockQuants } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { planResetInventory } from 'src/stock/utils/plan-reset-inventory.util';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

type LedgerLine = {
  productId: string;
  locationId: string | null;
  locationDestId: string | null;
  ownerId: string | null;
  lotId: string | null;
  packageId: string | null;
  resultPackageId: string | null;
  quantityProductUom: number | null;
};

const LEDGER_SELECTION = 'productId locationId locationDestId ownerId lotId packageId resultPackageId quantityProductUom';

// Reserved quantities are recomputed from the open lines of every variant, then the inventory is reset: each key whose
// history the stock row does not hold first takes the missing part (no move: the history already has it), then a count
// of the old on-hand is set on the row and applied through the count engine, which posts the counter-move to the
// inventory loss location.
const becomeStorable = async (templateId: string, digits: number) => {
  const variants = await productProducts.find<{ id: string }>({ productTmplId: { eq: templateId } }, 'id');
  const variantIds = variants.map((variant) => variant.id);

  if (variantIds.length === 0) {
    return;
  }

  const openLines = await stockMoveLines.find<LedgerLine>(
    { productId: { in: variantIds }, state: { in: OPEN_LINE_STATES } },
    LEDGER_SELECTION,
  );

  await recomputeReserved([...new Set(openLines.map((line) => sourceKeyOf(line)))]);

  const doneLines = await stockMoveLines.find<LedgerLine>(
    { productId: { in: variantIds }, state: { eq: MOVE_STATE.DONE } },
    LEDGER_SELECTION,
  );
  const quants = await stockQuants.find<{ quantKey: string | null; quantity: number }>(
    { productId: { in: variantIds } },
    'quantKey quantity',
  );
  const locationIds = doneLines.flatMap((line) => [line.locationId, line.locationDestId]);
  const locations = await readLocations(locationIds.flatMap((id) => (id === null ? [] : [id])));
  const steps = planResetInventory({
    doneLines: doneLines.map((line) => ({ ...line, quantityProductUom: line.quantityProductUom ?? 0 })),
    locationUsages: new Map<string, LocationUsage>([...locations.values()].map((location) => [location.id, location.usage])),
    onHand: new Map(quants.flatMap((quant) => (quant.quantKey === null ? [] : [[quant.quantKey, quant.quantity] as const]))),
    digits,
  });
  const countedQuantIds: string[] = [];

  for (const step of steps) {
    const { quantId, quantity } = await applyQuantDelta({ key: step.key, delta: step.delta, inDate: null });

    await stockQuants.update(quantId, {
      inventoryQuantity: step.count,
      inventoryQuantitySet: true,
      inventoryDiffQuantity: floatRound(step.count - quantity, 10 ** -digits, 'HALF-UP'),
      isOutdated: false,
    });
    countedQuantIds.push(quantId);
  }
  if (countedQuantIds.length > 0) {
    await applyInventory(countedQuantIds, { inventoryName: null, accountingDate: null, countedQuantIds });
  }
  await recomputeProductQuantities(variantIds);
  await recomputeTrackingForKeys(steps.map((step) => step.key));
};

// Tracking turned on.
export const handleBecomesStorable = async (
  events: ObjectRecordEvent<ProductTemplateEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const { productUnitDigits } = readStockSettings();

  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    if (before === undefined || after === undefined || isApplicationWrite(after)) {
      continue;
    }
    if (before.isStorable || !after.isStorable) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      // The storable-flag rule may have turned tracking off again in this same save.
      const [current] = await productTemplates.find<{ isStorable: boolean }>({ id: { eq: event.recordId } }, 'isStorable');

      if (current?.isStorable === true) {
        await becomeStorable(event.recordId, productUnitDigits);
      }
    });
  }
};
