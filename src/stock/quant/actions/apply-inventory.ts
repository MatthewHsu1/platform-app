import { CLAIM_HELD_MESSAGE, claimKey, openJournal, withClaim } from 'src/shared/claims/claim';
import { findSeedLocationId, readLocations } from 'src/stock/location/read-locations';
import { recomputeLocation } from 'src/stock/location/recompute-location';
import { doneMoves } from 'src/stock/move/actions/done-moves';
import { retryWaitingMoves } from 'src/stock/move/actions/retry-waiting-moves';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { createInventoryMoves } from 'src/stock/quant/actions/create-inventory-moves';
import { markLastCount } from 'src/stock/quant/actions/mark-last-count';
import { type ApplyInventoryOptions } from 'src/stock/quant/types/apply-inventory-options.type';
import { writeQuantCounts } from 'src/stock/quant/write-quant-counts';
import { StockUserError } from 'src/stock/stock-errors';
import { STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { stockLocations, stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { readStockSettings, todayUtc } from 'src/stock/stock-settings';
import { nextCountDate } from 'src/stock/utils/next-count-date.util';
import { planClearCounts } from 'src/stock/utils/plan-count-actions.util';
import { planInventoryMoves } from 'src/stock/utils/plan-inventory-moves.util';
import { type InventoryMovePlan } from 'src/stock/utils/types/inventory-move-plan.type';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

type CountPlan = { quantId: string; locationId: string; accountingDate: string | null; move: InventoryMovePlan };

// The row is read inside the claim, so the difference is the one stored now (a stock level brought up to its history
// before the count, as a product that starts tracking inventory does, is counted from there).
const planCount = async (quantId: string, options: ApplyInventoryOptions): Promise<CountPlan | null> => {
  const [quant] = await stockQuants.find<QuantRow>({ id: { eq: quantId } }, QUANT_ROW);

  if (quant === undefined || (options.countedQuantIds?.includes(quantId) === true && !quant.inventoryQuantitySet)) {
    return null;
  }
  const product = (await readStockProducts([quant.productId])).get(quant.productId);
  const seedInventoryLocationId = await findSeedLocationId(STOCK_SEED_KEYS.inventory);

  if (product === undefined || seedInventoryLocationId === null) {
    throw new Error(`Count of ${quantId}: the product or the Inventory adjustment location is missing.`);
  }
  const [move] = planInventoryMoves({
    quants: [
      {
        id: quant.id,
        productId: quant.productId,
        productUomId: product.uomId,
        locationId: quant.locationId,
        lotId: quant.lotId,
        packageId: quant.packageId,
        ownerId: quant.ownerId,
        quantity: quant.quantity,
        inventoryQuantity: quant.inventoryQuantity,
        inventoryDiffQuantity: quant.inventoryDiffQuantity,
        inventoryQuantitySet: quant.inventoryQuantitySet,
        propertyStockInventoryId: product.propertyStockInventoryId,
      },
    ],
    seedInventoryLocationId,
    inventoryName: options.inventoryName,
    digits: readStockSettings().productUnitDigits,
    newId: () => crypto.randomUUID(),
  });

  return { quantId, locationId: quant.locationId, accountingDate: options.accountingDate, move };
};

// After the move: waiting moves may reserve now, the location records today's
// count, and the row gets its next scheduled count and loses the typed one.
const finishCount = async (plan: CountPlan) => {
  const today = todayUtc();
  const settings = readStockSettings();

  await retryWaitingMoves([plan.move.moveId]);

  let location = (await readLocations([plan.locationId])).get(plan.locationId);

  if (location !== undefined && location.lastInventoryDate !== today) {
    await stockLocations.update(plan.locationId, { lastInventoryDate: today });
    await recomputeLocation([plan.locationId]);
    location = (await readLocations([plan.locationId])).get(plan.locationId);
  }
  const inventoryDate =
    location === undefined
      ? null
      : nextCountDate({
          usage: location.usage,
          nextInventoryDate: location.nextInventoryDate,
          today,
          annualInventoryMonth: settings.annualInventoryMonth,
          annualInventoryDay: settings.annualInventoryDay,
        });

  await writeQuantCounts([plan.quantId], (quant) => ({ ...planClearCounts([quant.id])[0].data, inventoryDate }));
  await markLastCount([plan.move]);
};

// `options` null: a resume, which finishes only a run that passed its commit point; a run that stopped before it
// wrote nothing, and its claim is freed.
const runCount = async (quantId: string, options: ApplyInventoryOptions | null, journal: ClaimJournal) => {
  if (options === null && !journal.committed) {
    return;
  }
  const plan = await journal.step<CountPlan | null>(
    'count:plan',
    async () => (options === null ? null : planCount(quantId, options)),
    async () => {},
  );

  if (plan === null) {
    return;
  }
  await journal.commit();

  await journal.step('count:move', async () => true, () => createInventoryMoves([plan.move]));
  await doneMoves([plan.move.moveId], {
    cancelBackorder: true,
    journal,
    stepPrefix: 'count:done',
    skipPackageHistory: true,
    moveDate: plan.accountingDate,
    retryWaiting: false,
  });
  await journal.step('count:finish', async () => true, () => finishCount(plan));
};

// One claim per stock row, so two people applying the same count move the
// stock once; the rows not held are applied, then the held ones are reported.
export const applyInventory = async (quantIds: string[], options: ApplyInventoryOptions) => {
  let held = false;

  for (const quantId of [...new Set(quantIds)]) {
    const key = claimKey('count', quantId);
    const outcome = await withClaim(key, async (runId) => runCount(quantId, options, await openJournal(key, runId)));

    held = held || outcome.kind === 'held';
  }
  if (held) {
    throw new StockUserError(CLAIM_HELD_MESSAGE);
  }
};

export const resumeCount = async (quantId: string) => {
  const key = claimKey('count', quantId);

  await withClaim(key, async (runId) => runCount(quantId, null, await openJournal(key, runId)));
};
