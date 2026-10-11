import { type Records } from 'src/shared/triggers/records';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { stockPackageHistories, stockPackageHistoryPickingLinks, stockPackages } from 'src/stock/package/package-records';
import { walkPackageTree } from 'src/stock/package/walk-package-tree';
import { type PackagePrintData } from 'src/stock/printing/types/package-print-data.type';
import { type PackageQuantRow } from 'src/stock/printing/types/package-quant-row.type';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockPickings, stockQuants } from 'src/stock/stock-records';
import { readResolvedUoms } from 'src/stock/stock-uoms';

type PackageRow = { id: string; name: string | null; packDate: string | null; packageType: { name: string | null } | null };
type TreeRow = { id: string; name: string | null; parentPackageId: string | null };
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
const QUANT_SELECTION =
  'id createdAt packageId productId quantity lot { deletedAt name } product { deletedAt name barcode productTmpl { deletedAt uomId } }';

const text = (value: string | null | undefined) => value ?? '';
const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

// The rows of these ids, in the order asked, each once; an id with no row is skipped.
export const findInOrder = async <TRow extends { id: string }>(of: Records, ids: string[], selection: string) => {
  const byId = new Map(
    (await readInChunks([...new Set(ids)], (part) => of.find<TRow>({ id: { in: part } }, selection))).map((row) => [row.id, row]),
  );

  return [...new Set(ids)].flatMap((id) => byId.get(id) ?? []);
};

// Each package with its own rows and, for each package directly inside it, the rows in that
// package and every package below it. Read as the app: the print page has no user.
export const readPackagePrintData = async (packageIds: string[]): Promise<PackagePrintData[]> => {
  const roots = await findInOrder<PackageRow>(stockPackages, packageIds, PACKAGE_SELECTION);
  const tree = await walkPackageTree<TreeRow>({
    startIds: roots.map((root) => root.id),
    up: [],
    down: ['parentPackageId'],
    selection: 'id name parentPackageId',
  });
  const quants = (
    await readInChunks([...new Set([...roots.map((root) => root.id), ...tree.keys()])], (part) =>
      stockQuants.find<QuantRow>({ packageId: { in: part } }, QUANT_SELECTION),
    )
  ).sort((left, right) => compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id));
  const uoms = await readResolvedUoms();
  const childrenOf = new Map<string, TreeRow[]>();

  for (const node of tree.values()) {
    if (node.parentPackageId !== null) {
      childrenOf.set(node.parentPackageId, [...(childrenOf.get(node.parentPackageId) ?? []), node]);
    }
  }
  const insideOf = (packageId: string) => {
    const found = new Set([packageId]);
    let level = [packageId];

    while (level.length > 0) {
      level = level.flatMap((id) => (childrenOf.get(id) ?? []).map((child) => child.id)).filter((id) => !found.has(id));
      level.forEach((id) => found.add(id));
    }
    return found;
  };
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
    const contained = rowsIn(insideOf(root.id));
    // Packages inside a package list by name, as package lists do.
    const children = [...(childrenOf.get(root.id) ?? [])].sort(
      (left, right) => compareText(text(left.name), text(right.name)) || compareText(left.id, right.id),
    );

    return {
      name: text(root.name),
      packDate: root.packDate,
      packageTypeName: text(root.packageType?.name),
      quants: own,
      children: children.map((child) => ({ name: text(child.name), quants: rowsIn(insideOf(child.id)) })),
      containedQuantCount: contained.length,
      directQuantCount: own.length,
    };
  });
};

// The packages package-history rows are about, each once, in the order of the rows.
export const readHistoryPackageIds = async (historyIds: string[]) =>
  (await findInOrder<{ id: string; packageId: string | null }>(stockPackageHistories, historyIds, 'id packageId')).flatMap(
    (history) => (history.packageId === null ? [] : [history.packageId]),
  );

// The packages of transfers: what a done transfer's package history names, else the packages its
// lines put goods in and every package those go into on arrival.
export const readPickingPackageIds = async (pickingIds: string[]) => {
  const pickings = await findInOrder<{ id: string; state: string }>(stockPickings, pickingIds, 'id state');
  const doneIds = pickings.filter((picking) => picking.state === PICKING_STATE.DONE).map((picking) => picking.id);
  const openIds = pickings.filter((picking) => picking.state !== PICKING_STATE.DONE).map((picking) => picking.id);
  const links = await readInChunks(doneIds, (part) =>
    stockPackageHistoryPickingLinks.find<{ stockPickingId: string; stockPackageHistoryId: string }>(
      { stockPickingId: { in: part } },
      'stockPickingId stockPackageHistoryId',
    ),
  );
  const historyPackageIds = await readHistoryPackageIds(links.map((link) => link.stockPackageHistoryId));
  const lines = (
    await readInChunks(openIds, (part) =>
      stockMoveLines.find<{ id: string; createdAt: string; resultPackageId: string | null }>(
        { pickingId: { in: part }, resultPackageId: { is: 'NOT_NULL' } },
        'id createdAt resultPackageId',
      ),
    )
  ).sort((left, right) => compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id));
  const resultIds = [...new Set(lines.flatMap((line) => (line.resultPackageId === null ? [] : [line.resultPackageId])))];
  const destinations = await walkPackageTree<{ id: string; packageDestId: string | null }>({
    startIds: resultIds,
    up: ['packageDestId'],
    down: [],
    selection: 'id packageDestId',
  });

  return [...new Set([...historyPackageIds, ...resultIds, ...destinations.keys()])];
};
