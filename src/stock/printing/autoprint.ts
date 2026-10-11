import { hasPersonToken } from 'src/shared/utils/has-person-token.util';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { createCheckedPrintPass } from 'src/stock/printing/create-print-pass';
import { type AutoprintPicking } from 'src/stock/printing/types/autoprint-picking.type';
import { type LotLabelFormat } from 'src/stock/printing/types/lot-label-format.type';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';
import { type ProductLabelFormat } from 'src/stock/printing/types/product-label-format.type';
import { planAutoprint, receptionAutoShow } from 'src/stock/printing/utils/plan-autoprint.util';
import { readReceptionData } from 'src/stock/reports/reception/read-reception-data';
import { LOT_LABEL_FORMAT, PRODUCT_LABEL_FORMAT } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoveMoveRels, stockMoves, stockPickings, stockPickingTypes } from 'src/stock/stock-records';

type PickingRow = { id: string; pickingTypeId: string | null; pickingTypeCode: string | null };
type TypeRow = {
  id: string;
  code: string | null;
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
  'id code autoShowReceptionReport autoPrintDeliverySlip autoPrintReturnSlip autoPrintReceptionReport autoPrintReceptionReportLabels autoPrintProductLabels productLabelFormat autoPrintLotLabels lotLabelFormat autoPrintPackages';

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

// The prints the operation types ask for when these transfers are validated, as one-time links for
// the user who validated. Only a user's own click gets them: they open only in that user's window,
// so a run nobody watches (a validation the daily job finishes) makes none. A print that fails
// leaves the others and the validation as they are.
export const autoprint = async (pickingIds: string[], timeZone: string): Promise<PrintLink[]> => {
  if (pickingIds.length === 0 || !hasPersonToken()) {
    return [];
  }
  const links: PrintLink[] = [];

  for (const job of planAutoprint(await readAutoprintPickings(pickingIds))) {
    const created = await createCheckedPrintPass({
      report: job.report,
      objectSingular: 'stockPicking',
      recordIds: job.pickingIds,
      options: job.options,
      timeZone,
    }).catch(() => null);

    if (created !== null) {
      links.push(created.link);
    }
  }
  return links;
};

// The validated receipts whose reception report opens for the user who validated them: their
// operation type asks for it and a waiting delivery of the warehouse can take what came in.
export const receptionReportToShow = async (pickingIds: string[]): Promise<string[]> => {
  if (pickingIds.length === 0 || !hasPersonToken()) {
    return [];
  }
  const flagged = (await readPickingsWithTypes(pickingIds)).filter(({ type }) => type.autoShowReceptionReport === true).map(({ picking }) => picking.id);

  if (flagged.length === 0) {
    return [];
  }
  const data = await readReceptionData({ pickingIds: flagged, batchId: null });
  const flaggedSet = new Set(flagged);
  const isFlagged = (pickingId: string | null) => pickingId !== null && flaggedSet.has(pickingId);
  const show = receptionAutoShow({
    flaggedPickingIds: flagged,
    lines: data.moves
      .filter((move) => isFlagged(move.pickingId))
      .map((move) => ({
        productId: move.productId,
        isStorable: move.isStorable,
        state: move.state,
        quantity: move.quantity,
        hasDestinationMoves: move.moveDestIds.length > 0,
      })),
    candidateOuts: data.moves
      .filter((move) => !isFlagged(move.pickingId))
      .map((move) => ({
        productId: move.productId,
        state: move.state,
        productQty: move.productQty,
        locationId: move.locationId,
        pickingId: move.pickingId,
        hasOrigins: move.moveOrigIds.length > 0,
      })),
    warehouseLocationIds: data.warehouseLocationIds,
  });

  return show ? flagged : [];
};
