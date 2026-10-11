import { floatRound } from 'src/shared/utils/float-round.util';
import { readLocations } from 'src/stock/location/read-locations';
import { stockLots } from 'src/stock/lot/lot-records';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { applyInventory } from 'src/stock/quant/actions/apply-inventory';
import { findOrCreateQuant } from 'src/stock/quant/find-or-create-quant';
import { quantKey } from 'src/stock/quant/quant-key';
import { type QuantityUpdateRow } from 'src/stock/quant/types/quantity-update-row.type';
import { writeQuantCounts } from 'src/stock/quant/write-quant-counts';
import { StockUserError } from 'src/stock/stock-errors';
import { stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { planQuantityUpdates } from 'src/stock/utils/plan-count-actions.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type QuantRow } from 'src/stock/types/quant-row.type';

export const NOT_STORABLE_MESSAGE = 'Only a product that tracks inventory has a quantity to update.';
export const LOT_OF_OTHER_PRODUCT_MESSAGE = 'This lot {lot} is incompatible with this product {product}.';
export const STOCK_ROW_MOVED_MESSAGE =
  'The stock of {product} in {location} changed since this list was opened. Reload it and type the count again.';

// The row a list line stands for, without making one: an added line may name a key that already holds stock.
const readQuant = async (row: QuantityUpdateRow): Promise<QuantRow | undefined> => {
  if (row.quantId === null) {
    const key = quantKey({ productId: row.productId, locationId: row.locationId, lotId: row.lotId, packageId: null, ownerId: null });

    return (await stockQuants.find<QuantRow>({ quantKey: { eq: key } }, QUANT_ROW))[0];
  }
  const [quant] = await stockQuants.find<QuantRow>({ id: { eq: row.quantId } }, QUANT_ROW);

  return quant?.productId === row.productId ? quant : undefined;
};

// The product's Update quantity list: the lines the user edited or added. A line whose stock moved since the list
// was read is refused, so a count typed against the old figure never undoes a transfer validated meanwhile. Every
// check runs before the first write.
export const updateQuantity = async (rows: QuantityUpdateRow[]) => {
  const digits = readStockSettings().productUnitDigits;
  const products = await readStockProducts([...new Set(rows.map((row) => row.productId))]);

  if (rows.some((row) => products.get(row.productId)?.isStorable !== true)) {
    throw new StockUserError(NOT_STORABLE_MESSAGE);
  }
  const lotIds = [...new Set(rows.flatMap((row) => (row.lotId === null ? [] : [row.lotId])))];
  const lots = new Map(
    (lotIds.length === 0
      ? []
      : await stockLots.find<{ id: string; name: string | null; productId: string | null }>({ id: { in: lotIds } }, 'id name productId')
    ).map((lot) => [lot.id, lot]),
  );
  const mismatch = rows.find((row) => row.lotId !== null && lots.get(row.lotId)?.productId !== row.productId);

  if (mismatch !== undefined && mismatch.lotId !== null) {
    throw new StockUserError(LOT_OF_OTHER_PRODUCT_MESSAGE, {
      lot: lots.get(mismatch.lotId)?.name ?? '',
      product: products.get(mismatch.productId)?.displayName ?? '',
    });
  }
  const lines: { row: QuantityUpdateRow; quant: QuantRow | undefined; onHand: number; counted: number }[] = [];

  for (const row of rows) {
    const quant = await readQuant(row);
    const onHand = quant?.quantity ?? 0;

    if (compareAtDigits(onHand, row.onHand, digits) !== 0) {
      const location = (await readLocations([row.locationId])).get(row.locationId);

      throw new StockUserError(STOCK_ROW_MOVED_MESSAGE, {
        product: products.get(row.productId)?.displayName ?? '',
        location: location?.completeName ?? location?.name ?? '',
      });
    }
    lines.push({ row, quant, onHand, counted: row.counted });
  }
  const counts = new Map<string, number>();

  for (const { row, quant, counted } of planQuantityUpdates(lines, digits)) {
    const target =
      quant ?? (await findOrCreateQuant({ productId: row.productId, locationId: row.locationId, lotId: row.lotId, ownerId: null }));

    counts.set(target.id, counted);
  }
  // Planned again from the row as it is when written: a stock level that moved since the check counts from where it is.
  const written = await writeQuantCounts([...counts.keys()], (quant) => {
    const counted = counts.get(quant.id);

    if (counted === undefined || planQuantityUpdates([{ onHand: quant.quantity, counted }], digits).length === 0) {
      return null;
    }

    return {
      inventoryQuantity: counted,
      inventoryDiffQuantity: floatRound(counted - quant.quantity, 10 ** -digits, 'HALF-UP'),
      inventoryQuantitySet: true,
      isOutdated: false,
    };
  });

  await applyInventory(written, { inventoryName: null, accountingDate: null, countedQuantIds: written });

  return { kind: 'done', applied: written.length };
};
