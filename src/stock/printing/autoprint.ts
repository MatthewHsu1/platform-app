import { hasPersonToken } from 'src/shared/utils/has-person-token.util';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { createCheckedPrintPass } from 'src/stock/printing/create-print-pass';
import { makeAutoprint } from 'src/stock/printing/make-autoprint';
import { type AutoprintPicking } from 'src/stock/printing/types/autoprint-picking.type';
import { type LotLabelFormat } from 'src/stock/printing/types/lot-label-format.type';
import { type ProductLabelFormat } from 'src/stock/printing/types/product-label-format.type';
import { warehouseLocationIds } from 'src/stock/printing/utils/warehouse-location-ids.util';
import { readReceptionData } from 'src/stock/reports/reception/read-reception-data';
import { LOT_LABEL_FORMAT, PRODUCT_LABEL_FORMAT } from 'src/stock/stock-options.constant';
import {
  stockLocations,
  stockMoveLines,
  stockMoveMoveRels,
  stockMoves,
  stockPickings,
  stockPickingTypes,
  stockWarehouses,
} from 'src/stock/stock-records';

type PickingRow = { id: string; pickingTypeId: string | null; pickingTypeCode: string | null };
type TypeRow = {
  id: string;
  code: string | null;
  warehouseId: string | null;
  autoShowReceptionReport: boolean | null;
  autoPrintDeliverySlip: boolean | null;
  autoPrintReturnSlip: boolean | null;
  autoPrintReceptionReport: boolean | null;
  autoPrintReceptionReportLabels: boolean | null;
  autoPrintProductLabels: boolean | null;
  productLabelFormat: ProductLabelFormat | null;
  autoPrintLotLabels: boolean | null;
  lotLabelFormat: LotLabelFormat | null;
  autoPrintPackages: boolean | null;
};

const TYPE_SELECTION =
  'id code warehouseId autoShowReceptionReport autoPrintDeliverySlip autoPrintReturnSlip autoPrintReceptionReport autoPrintReceptionReportLabels autoPrintProductLabels productLabelFormat autoPrintLotLabels lotLabelFormat autoPrintPackages';

// Operation type settings are configuration, read as the app; each print link then checks what
// the user may read.
const readPickingsWithTypes = async (pickingIds: string[]) => {
  const pickings = await readInChunks(pickingIds, (part) =>
    stockPickings.find<PickingRow>({ id: { in: part } }, 'id pickingTypeId pickingTypeCode'),
  );
  const typeIds = [...new Set(pickings.flatMap((picking) => (picking.pickingTypeId === null ? [] : [picking.pickingTypeId])))];
  const types = new Map((await readInChunks(typeIds, (part) => stockPickingTypes.find<TypeRow>({ id: { in: part } }, TYPE_SELECTION))).map((type) => [type.id, type]));
  const byId = new Map(pickings.map((picking) => [picking.id, picking]));

  return pickingIds.flatMap((id) => {
    const picking = byId.get(id);
    const typeId = picking?.pickingTypeId ?? null;
    const type = typeId === null ? undefined : types.get(typeId);

    return picking === undefined || type === undefined ? [] : [{ picking, type }];
  });
};

const readAutoprintPickings = async (pickingIds: string[]): Promise<AutoprintPicking[]> => {
  const withTypes = await readPickingsWithTypes(pickingIds);
  const ids = withTypes.map(({ picking }) => picking.id);
  const moves = await readInChunks(ids, (part) => stockMoves.find<{ id: string; pickingId: string | null }>({ pickingId: { in: part } }, 'id pickingId'));
  const links = await readInChunks(
    moves.map((move) => move.id),
    (part) => stockMoveMoveRels.find<{ moveOrigId: string }>({ moveOrigId: { in: part } }, 'moveOrigId'),
  );
  const lines = await readInChunks(ids, (part) =>
    stockMoveLines.find<{ pickingId: string | null; lotId: string | null; resultPackageId: string | null }>(
      { pickingId: { in: part } },
      'pickingId lotId resultPackageId',
    ),
  );
  const feedingMoveIds = new Set(links.map((link) => link.moveOrigId));
  const pickingsFeeding = new Set(moves.filter((move) => feedingMoveIds.has(move.id)).map((move) => move.pickingId));

  return withTypes.map(({ picking, type }) => ({
    id: picking.id,
    pickingTypeCode: picking.pickingTypeCode || type.code || '',
    autoPrintDeliverySlip: type.autoPrintDeliverySlip === true,
    autoPrintReturnSlip: type.autoPrintReturnSlip === true,
    autoPrintReceptionReport: type.autoPrintReceptionReport === true,
    autoPrintReceptionReportLabels: type.autoPrintReceptionReportLabels === true,
    autoPrintProductLabels: type.autoPrintProductLabels === true,
    productLabelFormat: type.productLabelFormat ?? PRODUCT_LABEL_FORMAT.PRICE_2X7,
    autoPrintLotLabels: type.autoPrintLotLabels === true,
    lotLabelFormat: type.lotLabelFormat ?? LOT_LABEL_FORMAT.LOTS_4X12,
    autoPrintPackages: type.autoPrintPackages === true,
    hasDestinationMoves: pickingsFeeding.has(picking.id),
    hasLots: lines.some((line) => line.pickingId === picking.id && line.lotId !== null),
    hasResultPackages: lines.some((line) => line.pickingId === picking.id && line.resultPackageId !== null),
  }));
};

const distinct = (ids: (string | null)[]) => [...new Set(ids.filter((id): id is string => id !== null))];

const readReceptionFlags = async (pickingIds: string[]) => {
  const flagged = (await readPickingsWithTypes(pickingIds)).filter(({ type }) => type.autoShowReceptionReport === true);

  return { pickingIds: flagged.map(({ picking }) => picking.id), warehouseIds: distinct(flagged.map(({ type }) => type.warehouseId)) };
};

// Warehouses and their locations are configuration, read as the app.
const readWarehouseLocationIds = async (warehouseIds: string[]) => {
  const warehouses = await readInChunks(warehouseIds, (part) =>
    stockWarehouses.find<{ viewLocationId: string | null }>({ id: { in: part } }, 'viewLocationId'),
  );
  const views = await readInChunks(distinct(warehouses.map((warehouse) => warehouse.viewLocationId)), (part) =>
    stockLocations.find<{ parentPath: string | null }>({ id: { in: part } }, 'parentPath'),
  );
  const paths = distinct(views.map((view) => view.parentPath));

  if (paths.length === 0) {
    return new Set<string>();
  }
  const locations = await stockLocations.find<{ id: string; parentPath: string | null; usage: string }>(
    { or: paths.map((path) => ({ parentPath: { like: `${path}%` } })) },
    'id parentPath usage',
  );

  return warehouseLocationIds(paths, locations);
};

export const { autoprint, receptionReportToShow } = makeAutoprint({
  hasPersonToken: () => hasPersonToken(),
  readAutoprintPickings,
  createPrintPass: createCheckedPrintPass,
  readReceptionFlags,
  readReceptionMoves: async (pickingIds) => (await readReceptionData({ pickingIds, batchId: null })).moves,
  readWarehouseLocationIds,
});
