import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { stockPackages } from 'src/stock/package/package-records';
import { applyPutawayStrategy } from 'src/stock/putaway/apply-putaway-strategy';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { updateAsUser } from 'src/stock/stock-person-writes';
import { stockMoveLines } from 'src/stock/stock-records';
import { destinationChains } from 'src/stock/utils/plan-entire-pack.util';
import { packageDestinationDescendants } from 'src/stock/utils/plan-package-rules.util';
import { planPackageDestChange } from 'src/stock/utils/plan-put-in-pack.util';
import { type PackTarget } from 'src/stock/utils/types/pack-target.type';

// The package is made as the clicking user; the package trigger names it when no name is given. Its id comes from
// the pop-up's run, so a Confirm sent again after an error finds the package the first one made.
export const resolveTarget = async (target: PackTarget, runId: string) => {
  if (target.kind === 'existing') {
    return target.packageId;
  }
  const packageId = derivedId('putInPack', runId);
  const [stored] = await stockPackages.findIncludingDeleted<{ id: string; deletedAt: string | null }>(
    { id: { eq: packageId } },
    'id deletedAt',
  );

  if (stored !== undefined) {
    if (stored.deletedAt !== null) {
      await stockPackages.restore(packageId);
    }
    return packageId;
  }
  requireData(
    await twentyGraphql<{ createStockPackage: { id: string } }>(
      'person',
      `mutation NewPackage($data: StockPackageCreateInput!) { createStockPackage(data: $data) { id } }`,
      { data: { id: packageId, packageTypeId: target.packageTypeId, ...(target.name === null ? {} : { name: target.name }) } },
    ),
    'Create package',
  );

  return packageId;
};

export const setLineDestination = (lineIds: string[], locationDestId: string) =>
  updateAsUser('stockMoveLine', lineIds, { locationDestId });

// A line packed alone gets its new place in the same write, so it is never packed but not placed.
export const packLines = (lineIds: string[], packageId: string, locationDestId: string | null = null) =>
  updateAsUser('stockMoveLine', lineIds, { resultPackageId: packageId, ...(locationDestId === null ? {} : { locationDestId }) });

export const unpackLines = (lineIds: string[]) => updateAsUser('stockMoveLine', lineIds, { resultPackageId: null });

// The open lines that go into the packages, or into packages headed into them.
export const readOpenLinesInto = async <TLine extends { id: string; resultPackageId: string | null }>(
  packageIds: string[],
  headed: { id: string; packageDestId: string | null }[],
  selection: string,
) => {
  const inside = new Set(packageIds.flatMap((packageId) => [...packageDestinationDescendants(packageId, headed)]));

  return stockMoveLines.find<TLine>(
    { resultPackageId: { in: [...inside] }, not: { state: { in: [MOVE_STATE.DONE, MOVE_STATE.CANCEL] } } },
    selection,
  );
};

export const readHeadedPackages = () =>
  stockPackages.find<{ id: string; packageDestId: string | null }>({ packageDestId: { is: 'NOT_NULL' } }, 'id packageDestId');

// The packages go into the target. Containers they leave keep their own
// destination only while lines still go into them, and the lines now inside
// the target are put away again, since their outermost package changed.
export const packPackages = async (movedIds: string[], targetId: string) => {
  const headed = await readHeadedPackages();
  const graph = [
    ...headed,
    ...[...movedIds, targetId].filter((id) => !headed.some((pack) => pack.id === id)).map((id) => ({ id, packageDestId: null })),
  ];
  const after = graph.map((pack) => (movedIds.includes(pack.id) ? { ...pack, packageDestId: targetId } : pack));
  const chainIds = destinationChains(movedIds, graph);
  const openLines = await readOpenLinesInto<{ id: string; resultPackageId: string }>([...chainIds, targetId], after, 'id resultPackageId');
  const plan = planPackageDestChange({
    packages: graph,
    movedIds,
    targetId,
    openLineResultPackageIds: new Set(openLines.map((line) => line.resultPackageId)),
  });

  await updateAsUser('stockPackage', plan.setDest, { packageDestId: targetId });
  await stockPackages.updateMany(plan.clearDest, { packageDestId: null });

  const inside = packageDestinationDescendants(targetId, after);

  await applyPutawayStrategy(openLines.filter((line) => inside.has(line.resultPackageId)).map((line) => line.id));
};
