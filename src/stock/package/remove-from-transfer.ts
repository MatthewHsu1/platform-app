import { readHeadedPackages, readOpenLinesInto, unpackLines } from 'src/stock/package/pack-into';
import { applyPutawayStrategy } from 'src/stock/putaway/apply-putaway-strategy';
import { StockUserError } from 'src/stock/stock-errors';
import { deleteAsUser, updateAsUser } from 'src/stock/stock-person-writes';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { destinationChains, planRemovePackage } from 'src/stock/utils/plan-entire-pack.util';
import { packageDestinationDescendants } from 'src/stock/utils/plan-package-rules.util';

const PACKAGE_NOT_IN_TRANSFER = 'A selected package is not in an open transfer.';

type OpenLine = { id: string; resultPackageId: string; isEntirePack: boolean | null; moveId: string | null };

// Takes the packages out of every open transfer that moves them, with the
// user's rights. A move left with no demand and no line is cancelled by
// Validate, so a run stopped between the line and move deletes leaves
// nothing a later step does not clear.
export const removePackagesFromTransfers = async (packageIds: string[]) => {
  const headed = await readHeadedPackages();
  const graph = [
    ...headed,
    ...packageIds.filter((id) => !headed.some((pack) => pack.id === id)).map((id) => ({ id, packageDestId: null })),
  ];
  const openLines = await readOpenLinesInto<OpenLine>([...destinationChains(packageIds, graph)], graph, 'id resultPackageId isEntirePack moveId');
  const linePackageIds = new Set(openLines.map((line) => line.resultPackageId));

  if (packageIds.some((packageId) => ![...packageDestinationDescendants(packageId, graph)].some((id) => linePackageIds.has(id)))) {
    throw new StockUserError(PACKAGE_NOT_IN_TRANSFER);
  }
  const selected = new Set(packageIds);
  const moveIds = [
    ...new Set(openLines.flatMap((line) => (line.isEntirePack === true && selected.has(line.resultPackageId) ? (line.moveId ?? []) : []))),
  ];
  const [moves, moveLines] = await Promise.all([
    stockMoves.find<{ id: string; productUomQty: number | null }>({ id: { in: moveIds } }, 'id productUomQty'),
    stockMoveLines.find<{ id: string; moveId: string }>({ moveId: { in: moveIds } }, 'id moveId'),
  ]);
  const plan = planRemovePackage({
    packageIds,
    packages: graph,
    openLines: openLines.map((line) => ({ ...line, isEntirePack: line.isEntirePack === true })),
    moves: moves.map((move) => ({
      id: move.id,
      productUomQty: move.productUomQty ?? 0,
      lineIds: moveLines.filter((line) => line.moveId === move.id).map((line) => line.id),
    })),
  });

  await deleteAsUser('stockMoveLine', plan.deleteLineIds);
  await unpackLines(plan.clearResultLineIds);
  await deleteAsUser('stockMove', plan.deleteMoveIds);
  await updateAsUser('stockPackage', plan.clearDestIds, { packageDestId: null });
  await applyPutawayStrategy(plan.putawayLineIds);

  return plan;
};
