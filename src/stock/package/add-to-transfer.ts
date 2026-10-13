import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { readPackageContents, readPackageTreeIds } from 'src/stock/package/read-package-content';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { applyPutawayStrategy } from 'src/stock/putaway/apply-putaway-strategy';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { deleteAsUser, personMoveLines, updateAsUser } from 'src/stock/stock-person-writes';
import { stockMoveLines, stockPickings, stockQuants } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { planAddEntirePacks, planDestForEntirePacks } from 'src/stock/utils/plan-entire-pack.util';

const TRANSFER_NOT_FOUND = 'Transfer not found.';
const TRANSFER_WITHOUT_DESTINATION = 'The transfer has no destination location.';
const TRANSFER_CLOSED = 'Packages can only be added to a transfer that is not done or cancelled.';

type QuantRow = {
  id: string;
  productId: string;
  quantity: number;
  locationId: string;
  packageId: string;
  lotId: string | null;
  ownerId: string | null;
};

// The packages, with the packages inside them, join the transfer whole: the
// transfer's lines already taken from them are replaced by one line per row
// of stock they hold, put away, and containers taken whole go along with
// their packages. The line ids come from the pop-up's run, so a request sent
// again after an error keeps the lines the first one made.
export const addPackagesToTransfer = async (packageIds: string[], pickingId: string, runId: string) => {
  const [picking] =
    (await filterReadableIds('stockPicking', 'stockPickings', [pickingId])).length === 0
      ? []
      : await stockPickings.find<{ id: string; state: string; locationDestId: string | null }>(
          { id: { eq: pickingId } },
          'id state locationDestId',
        );

  if (picking === undefined) {
    throw new StockUserError(TRANSFER_NOT_FOUND);
  }
  if (picking.state === PICKING_STATE.DONE || picking.state === PICKING_STATE.CANCEL) {
    throw new StockUserError(TRANSFER_CLOSED);
  }
  if (picking.locationDestId === null) {
    throw new StockUserError(TRANSFER_WITHOUT_DESTINATION);
  }
  const allIds: string[] = [];

  for (const packageId of packageIds) {
    allIds.push(...(await readPackageTreeIds(packageId)));
  }
  const allPackageIds = new Set(allIds);
  const quants = await stockQuants.find<QuantRow>(
    { packageId: { in: [...allPackageIds] }, quantity: { neq: 0 } },
    'id productId quantity locationId packageId lotId ownerId',
  );
  const products = await readStockProducts(quants.map((quant) => quant.productId));
  const plan = planAddEntirePacks({
    quants: quants.flatMap((quant) => {
      const uomId = products.get(quant.productId)?.uomId;

      return uomId === undefined ? [] : [{ ...quant, productUomId: uomId }];
    }),
    pickingId: picking.id,
    locationDestId: picking.locationDestId,
    digits: readStockSettings().productUnitDigits,
  });

  if (plan.kind === 'refuse') {
    throw new StockUserError(plan.reason);
  }
  const rows = plan.lines.map((line) => ({ id: derivedId('addToTransfer', runId, line.quantId), data: line.data }));
  const ownIds = new Set(rows.map((row) => row.id));
  const replaced = (
    await stockMoveLines.find<{ id: string }>({ pickingId: { eq: picking.id }, packageId: { in: [...allPackageIds] } }, 'id')
  ).filter((line) => !ownIds.has(line.id));

  await deleteAsUser('stockMoveLine', replaced.map((line) => line.id));
  await createMissingRows(personMoveLines, rows);

  const lineIds = rows.map((row) => row.id);
  const unmarked = await stockMoveLines.find<{ id: string; isEntirePack: boolean | null }>({ id: { in: lineIds } }, 'id isEntirePack');

  await stockMoveLines.updateMany(
    unmarked.filter((line) => line.isEntirePack !== true).map((line) => line.id),
    { isEntirePack: true },
  );
  await applyPutawayStrategy(lineIds);

  const resultPackageIds = [
    ...new Set(
      (
        await stockMoveLines.find<{ resultPackageId: string }>(
          { pickingId: { eq: picking.id }, resultPackageId: { is: 'NOT_NULL' } },
          'resultPackageId',
        )
      ).map((line) => line.resultPackageId),
    ),
  ];
  const destUpdates = planDestForEntirePacks({
    resultPackageIds,
    packages: await readPackageContents(resultPackageIds),
    allowedPackageIds: allPackageIds,
  });

  for (const packageDestId of new Set(destUpdates.map((update) => update.packageDestId))) {
    await updateAsUser(
      'stockPackage',
      destUpdates.filter((update) => update.packageDestId === packageDestId).map((update) => update.id),
      { packageDestId },
    );
  }
  return lineIds;
};
