import { groupBy } from 'src/shared/utils/group-by.util';
import { stockPackages } from 'src/stock/package/package-records';
import { readPackageContents } from 'src/stock/package/read-package-content';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { stockMoveLines } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { lineQuantityInProductUnit } from 'src/stock/utils/line-quantity-in-product-unit.util';
import { planEntirePack } from 'src/stock/utils/plan-entire-pack.util';
import { type EntirePackLine } from 'src/stock/utils/types/entire-pack-line.type';

type LineRow = Omit<EntirePackLine, 'isStorable' | 'isEntirePack' | 'quantityProductUom'> & {
  quantity: number | null;
  productUomId: string | null;
  quantityProductUom: number | null;
  isEntirePack: boolean | null;
};

const LINE_SELECTION = 'id pickingId packageId resultPackageId state productId lotId quantity productUomId quantityProductUom isEntirePack';

// Every line of the transfers, done ones included, as the whole-package rules see them.
export const readEntirePackLines = async (pickingIds: string[]): Promise<EntirePackLine[]> => {
  const rows = await stockMoveLines.find<LineRow>({ pickingId: { in: [...new Set(pickingIds)] } }, LINE_SELECTION);
  const [products, uoms] = await Promise.all([readStockProducts(rows.map((row) => row.productId)), readResolvedUoms()]);
  const digits = readStockSettings().productUnitDigits;

  return rows.map((row) => ({
    ...row,
    quantityProductUom: lineQuantityInProductUnit({ line: row, productUomId: products.get(row.productId)?.uomId ?? null, uoms, digits }),
    isStorable: products.get(row.productId)?.isStorable === true,
    isEntirePack: row.isEntirePack === true,
  }));
};

// Runs at the end of a reservation and on a new backorder: lines that take a
// package whole move it as itself, and containers whose every package moves
// go along.
export const checkEntirePack = async (pickingIds: string[]): Promise<void> => {
  if (pickingIds.length === 0) {
    return;
  }
  const lines = await readEntirePackLines(pickingIds);
  const packageIds = lines.flatMap((line) => [line.packageId, line.resultPackageId].flatMap((id) => id ?? []));

  if (packageIds.length === 0) {
    return;
  }
  const plan = planEntirePack({
    lines,
    packages: await readPackageContents(packageIds),
    digits: readStockSettings().productUnitDigits,
  });

  for (const [resultPackageId, updates] of groupBy(plan.lineUpdates, (update) => update.resultPackageId)) {
    await stockMoveLines.updateMany(
      updates.map((update) => update.id),
      { resultPackageId, isEntirePack: true },
    );
  }
  for (const [packageDestId, updates] of groupBy(plan.packageDestUpdates, (update) => update.packageDestId)) {
    await stockPackages.updateMany(
      updates.map((update) => update.id),
      { packageDestId },
    );
  }
};
