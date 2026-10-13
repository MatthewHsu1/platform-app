import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { stockPackageHistories, stockPackageHistoryPickingLinks } from 'src/stock/package/package-records';
import { readPackageNodes } from 'src/stock/package/validate/package-validate-data';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines } from 'src/stock/stock-records';
import { planPackageHistory } from 'src/stock/utils/plan-packages-at-validate.util';

type OpenLine = { id: string; resultPackageId: string; locationDestId: string; pickingId: string | null; packageHistoryId: string | null };

// Before the stock moves, each package the lines put stock into, and every
// container it is headed into, gets a frozen row of where it is and where it
// goes. The row ids come from the package and the lines being done, so a
// rerun after a stop finds the rows it made instead of making a second set.
export const writePackageHistory = async (lineIds: string[]) => {
  if (lineIds.length === 0) {
    return;
  }
  const lines = await readInChunks([...new Set(lineIds)], (part) =>
    stockMoveLines.find<{ id: string; resultPackageId: string | null }>({ id: { in: part } }, 'id resultPackageId'),
  );
  const resultPackageIds = [...new Set(lines.flatMap((line) => line.resultPackageId ?? []))];

  if (resultPackageIds.length === 0) {
    return;
  }
  const nodes = await readPackageNodes(resultPackageIds);
  const openLines = await readInChunks([...nodes.keys()], (part) =>
    stockMoveLines.find<OpenLine>(
      { resultPackageId: { in: part }, not: { state: { in: [MOVE_STATE.DONE, MOVE_STATE.CANCEL] } } },
      'id resultPackageId locationDestId pickingId packageHistoryId',
    ),
  );
  const runKey = [...new Set(lineIds)].sort().join(',');
  const historyOf = new Map(openLines.map((line) => [line.id, line.packageHistoryId]));

  for (const row of planPackageHistory({ resultPackageIds, packages: nodes, openLines })) {
    const historyId = derivedId('packageHistory', row.packageId, runKey);

    await createMissingRows(stockPackageHistories, [
      {
        id: historyId,
        data: {
          packageName: row.packageName,
          packageId: row.packageId,
          locationId: row.locationId,
          locationDestId: row.locationDestId,
          parentOrigId: row.parentOrigId,
          parentOrigName: row.parentOrigName,
          parentDestId: row.parentDestId,
          parentDestName: row.parentDestName,
          outermostDestId: row.outermostDestId,
        },
      },
    ]);
    await createMissingRows(
      stockPackageHistoryPickingLinks,
      row.pickingIds.map((pickingId) => ({
        id: derivedId('packageHistoryPicking', historyId, pickingId),
        data: { stockPackageHistoryId: historyId, stockPickingId: pickingId },
      })),
    );
    await stockMoveLines.updateMany(
      row.moveLineIds.filter((id) => historyOf.get(id) !== historyId),
      { packageHistoryId: historyId },
    );
  }
};
