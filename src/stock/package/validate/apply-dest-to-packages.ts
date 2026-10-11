import { addNote } from 'src/shared/triggers/put-back';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { readValidateLines } from 'src/stock/lot/validate/read-validate-lines';
import { stockPackages } from 'src/stock/package/package-records';
import { readPackageValidateData } from 'src/stock/package/validate/package-validate-data';
import { deleteZeroQuants } from 'src/stock/quant/delete-zero-quants';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { planPackagesAfterDone } from 'src/stock/utils/plan-packages-after-done.util';
import { selectLinesToBeDone } from 'src/stock/utils/plan-lots-at-validate.util';
import { type PackagesAfterDonePlan } from 'src/stock/package/types/packages-after-done-plan.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type PackageNode } from 'src/stock/utils/types/package-node.type';

// The lines the other transfers of the click will still commit; transfers
// already done in this click moved their stock and have none left.
const readPendingLines = async (siblingPickingIds: string[]) => {
  if (siblingPickingIds.length === 0) {
    return [];
  }
  const { lines, moves } = await readValidateLines(siblingPickingIds);

  return selectLinesToBeDone({ lines, moves, uoms: await readResolvedUoms(), digits: readStockSettings().productUnitDigits }).filter(
    (line) => line.state !== MOVE_STATE.DONE && line.state !== MOVE_STATE.CANCEL,
  );
};

// Read once the lines are done; the plan is stored before anything is written.
export const readPackagesAfterDone = async (
  lineIds: string[],
  { skipContainers, siblingPickingIds }: { skipContainers: boolean; siblingPickingIds: string[] },
): Promise<PackagesAfterDonePlan> => {
  const lines = (
    await readInChunks([...new Set(lineIds)], (part) => stockMoveLines.find<MoveLineRow>({ id: { in: part } }, MOVE_LINE_ROW))
  ).map((line) => ({
    ...line,
    locationId: line.locationId ?? '',
    locationDestId: line.locationDestId ?? '',
    quantityProductUom: line.quantityProductUom ?? line.quantity,
  }));
  const resultPackageIds = lines.flatMap((line) => line.resultPackageId ?? []);
  const judged = !skipContainers && resultPackageIds.length > 0;
  const pendingLines = judged ? await readPendingLines(siblingPickingIds) : [];
  const data = judged
    ? await readPackageValidateData(
        [...resultPackageIds, ...pendingLines.flatMap((line) => [line.packageId, line.resultPackageId].flatMap((id) => id ?? []))],
        pendingLines.map((line) => line.locationDestId),
      )
    : { nodes: new Map<string, PackageNode>(), packageQuants: [], locationNames: new Map<string, string>() };

  return planPackagesAfterDone({
    lines,
    skipContainers,
    packages: data.nodes,
    packageQuants: data.packageQuants,
    pendingLines,
    locationNames: data.locationNames,
  });
};

export const applyPackagesAfterDone = async (plan: PackagesAfterDonePlan) => {
  for (const write of plan.containerWrites) {
    await stockPackages.update(write.id, { parentPackageId: write.parentPackageId, packageDestId: write.packageDestId });
  }
  for (const note of plan.notes) {
    await addNote({ ...note, title: 'Packages not put in their containers' });
  }
  await deleteZeroQuants(plan.emptyRowKeys);
};
