import { type Records } from 'src/shared/triggers/records';
import { compareText } from 'src/shared/utils/compare-text.util';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { stockPackageHistories, stockPackageHistoryPickingLinks, stockPackages } from 'src/stock/package/package-records';
import { findIn, findInOrder } from 'src/stock/printing/print-rows';
import { type PackagePrintData } from 'src/stock/printing/types/package-print-data.type';
import { type PackageQuantRow } from 'src/stock/printing/types/package-quant-row.type';
import { packageTree } from 'src/stock/printing/utils/package-tree.util';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockPickings, stockQuants } from 'src/stock/stock-records';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type RowFinder } from 'src/stock/types/row-finder.type';

type PackageRow = { id: string; name: string | null; packDate: string | null; packageType: { name: string | null } | null };
type TreeRow = { id: string; name: string | null; packDate: string | null; parentPackageId: string | null; packageDestId: string | null };
type QuantRow = {
  id: string;
  createdAt: string;
  packageId: string;
  productId: string;
  quantity: number | null;
  lot: { name: string | null } | null;
  product: { name: string | null; barcode: string | null; productTmpl: { uomId: string | null } | null } | null;
};

// Twenty returns a nested to-one relation as null unless its deletedAt is selected.
const PACKAGE_SELECTION = 'id name packDate packageType { deletedAt name }';
const TREE_SELECTION = 'id name packDate parentPackageId packageDestId';
const QUANT_SELECTION =
  'id createdAt packageId productId quantity lot { id deletedAt name } product { deletedAt name barcode productTmpl { deletedAt uomId } }';
// Packages nest a few levels deep; a walk stops here should the data hold a loop.
const MAX_DEPTH = 100;

const text = (value: string | null | undefined) => value ?? '';

// Packages level by level: `next` gives the filter for the next level from the ids found, `pick`
// the id to go on from in each row found.
const walk = async (find: RowFinder, startIds: string[], next: (level: string[]) => Record<string, unknown>, pick: (row: TreeRow) => string | null) => {
  const found = new Map<string, TreeRow>();
  const asked = new Set<string>();
  let level = [...new Set(startIds)];

  for (let depth = 0; level.length > 0 && depth < MAX_DEPTH; depth += 1) {
    level.forEach((id) => asked.add(id));
    const rows = (await readInChunks(level, (part) => findIn<TreeRow>(find, stockPackages, next(part), TREE_SELECTION))).filter(
      (row) => !found.has(row.id),
    );

    rows.forEach((row) => found.set(row.id, row));
    level = [...new Set(rows.flatMap((row) => pick(row) ?? []))].filter((id) => !asked.has(id));
  }
  return found;
};

// Each package with its own rows and, for each package directly inside it, the rows in that
// package and every package below it.
export const readPackagePrintData = async (find: RowFinder, packageIds: string[]): Promise<PackagePrintData[]> => {
  const roots = await findInOrder<PackageRow>(find, stockPackages, packageIds, PACKAGE_SELECTION);
  const below = await walk(
    find,
    roots.map((root) => root.id),
    (part) => ({ parentPackageId: { in: part } }),
    (row) => row.id,
  );
  const tree = packageTree([...below.values()].map((node) => ({ id: node.id, name: text(node.name), parentPackageId: node.parentPackageId })));
  const quants = (
    await readInChunks([...new Set([...roots.map((root) => root.id), ...below.keys()])], (part) =>
      findIn<QuantRow>(find, stockQuants, { packageId: { in: part } }, QUANT_SELECTION),
    )
  ).sort((left, right) => compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id));
  const uoms = await readResolvedUoms();
  const rowsIn = (packageIds: Set<string>): PackageQuantRow[] =>
    quants
      .filter((quant) => packageIds.has(quant.packageId))
      .map((quant) => ({
        productId: quant.productId,
        productName: text(quant.product?.name),
        productBarcode: text(quant.product?.barcode),
        lotName: text(quant.lot?.name),
        quantity: quant.quantity ?? 0,
        uomName: uoms.get(quant.product?.productTmpl?.uomId ?? '')?.name ?? '',
      }));

  return roots.map((root) => {
    const own = rowsIn(new Set([root.id]));

    return {
      name: text(root.name),
      packDate: root.packDate,
      packageTypeName: text(root.packageType?.name),
      quants: own,
      children: tree.children(root.id).map((child) => ({ name: child.name, packDate: below.get(child.id)?.packDate ?? null, quants: rowsIn(tree.inside(child.id)) })),
      containedQuantCount: rowsIn(tree.inside(root.id)).length,
      directQuantCount: own.length,
    };
  });
};

const packageIdsOf = async (find: RowFinder, of: Records, ids: string[]) =>
  (await findInOrder<{ id: string; packageId: string | null }>(find, of, ids, 'packageId')).flatMap((row) =>
    row.packageId === null ? [] : [row.packageId],
  );

// The packages package-history rows are about, each once, in the order of the rows.
export const readHistoryPackageIds = (find: RowFinder, historyIds: string[]) => packageIdsOf(find, stockPackageHistories, historyIds);

// The packages of transfers: what a done transfer's package history names, else the packages its
// lines put goods in and every package those go into on arrival.
export const readPickingPackageIds = async (find: RowFinder, pickingIds: string[]) => {
  const pickings = await findInOrder<{ id: string; state: string }>(find, stockPickings, pickingIds, 'state');
  const doneIds = pickings.filter((picking) => picking.state === PICKING_STATE.DONE).map((picking) => picking.id);
  const openIds = pickings.filter((picking) => picking.state !== PICKING_STATE.DONE).map((picking) => picking.id);
  const links = await readInChunks(doneIds, (part) =>
    findIn<{ stockPackageHistoryId: string }>(find, stockPackageHistoryPickingLinks, { stockPickingId: { in: part } }, 'stockPackageHistoryId'),
  );
  const historyPackageIds = await readHistoryPackageIds(
    find,
    links.map((link) => link.stockPackageHistoryId),
  );
  const lines = (
    await readInChunks(openIds, (part) =>
      findIn<{ id: string; createdAt: string; resultPackageId: string | null }>(
        find,
        stockMoveLines,
        { pickingId: { in: part }, resultPackageId: { is: 'NOT_NULL' } },
        'createdAt resultPackageId',
      ),
    )
  ).sort((left, right) => compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id));
  const resultIds = [...new Set(lines.flatMap((line) => (line.resultPackageId === null ? [] : [line.resultPackageId])))];
  const destinations = await walk(find, resultIds, (part) => ({ id: { in: part } }), (row) => row.packageDestId);

  return [...new Set([...historyPackageIds, ...destinations.keys()])];
};
