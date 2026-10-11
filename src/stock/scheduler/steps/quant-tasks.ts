import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeTrackingForKeys } from 'src/stock/lot/recompute-tracking-for-keys';
import { parseQuantKey, sourceKeyOf } from 'src/stock/quant/quant-key';
import { destroyEmptyQuants } from 'src/stock/quant/delete-zero-quants';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { checkLedger } from 'src/stock/scheduler/check-ledger';
import { readStorableProductIds } from 'src/stock/scheduler/ledger-store';
import { OPEN_LINE_STATES } from 'src/stock/stock-options.constant';
import { stockLocations, stockMoveLines, stockQuants } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { planReservedRecompute } from 'src/stock/utils/plan-reserved-recompute.util';
import { emptyQuantFilter, planZeroQuantCleanup } from 'src/stock/utils/plan-zero-quant-cleanup.util';
import { type CleanupQuant } from 'src/stock/utils/types/cleanup-quant.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

const KEY_CHUNK = 100;

// The keys whose reserved quantity differs from their open lines (the nightly reservation
// clean-up), read in bulk; recomputeReserved then rewrites only those.
const keysToRecompute = async () => {
  const storable = new Set(await readStorableProductIds());
  const [reservedRows, openLines] = await Promise.all([
    stockQuants.find<{ quantKey: string | null; reservedQuantity: number }>(
      { reservedQuantity: { neq: 0 } },
      'quantKey reservedQuantity',
    ),
    stockMoveLines.find<{
      productId: string;
      locationId: string | null;
      locationDestId: string | null;
      ownerId: string | null;
      lotId: string | null;
      packageId: string | null;
      quantityProductUom: number;
    }>(
      { and: [{ state: { in: OPEN_LINE_STATES } }, { quantityProductUom: { neq: 0 } }] },
      'productId locationId locationDestId ownerId lotId packageId quantityProductUom',
    ),
  ]);
  const reservedQuants = reservedRows.flatMap((row) =>
    row.quantKey === null ? [] : [{ quantKey: row.quantKey, reservedQuantity: row.reservedQuantity }],
  );
  const lines = openLines
    .filter((line) => line.locationId !== null && storable.has(line.productId))
    .map((line) => ({ key: sourceKeyOf(line), quantityProductUom: line.quantityProductUom }));
  const locationIds = [
    ...new Set([...reservedQuants.map((quant) => quant.quantKey), ...lines.map((line) => line.key)].map(
      (key) => parseQuantKey(key).locationId,
    )),
  ];
  const locations = await stockLocations.find<{ id: string; usage: LocationUsage }>({ id: { in: locationIds } }, 'id usage');

  return planReservedRecompute({
    reservedQuants,
    openLines: lines,
    bypassLocationIds: locations.filter((location) => bypassesReservation(location.usage)).map((location) => location.id),
    digits: readStockSettings().productUnitDigits,
  });
};

const removeEmptyRows = async () => {
  const { productUnitDigits } = readStockSettings();
  const candidates = await stockQuants.find<
    Omit<CleanupQuant, 'quantity'> & { quantity: number | null }
  >(emptyQuantFilter(productUnitDigits), 'id quantity reservedQuantity inventoryQuantity assignedUserId');
  const emptyIds = planZeroQuantCleanup({
    quants: candidates.map((quant) => ({ ...quant, quantity: quant.quantity ?? 0 })),
    productUnitDigits,
  });

  await destroyEmptyQuants(emptyIds, productUnitDigits);
};

// Reserved first, then empty rows: a row whose stale reservation is cleared goes the same night.
export const runQuantTasks = async () => {
  const errors = errorCollector();
  let keys: string[] = [];

  await errors.run('read the keys to recompute', async () => {
    keys = await keysToRecompute();
  });
  for (let start = 0; start < keys.length; start += KEY_CHUNK) {
    const part = keys.slice(start, start + KEY_CHUNK);

    await errors.run(`recompute reserved of ${part.length} keys`, () => recomputeReserved(part));
  }
  await errors.run('remove empty stock rows', removeEmptyRows);
  await errors.run('check stock levels against the done lines', async () => {
    await recomputeTrackingForKeys((await checkLedger()).fixed);
  });
  errors.throwIfAny();
};
