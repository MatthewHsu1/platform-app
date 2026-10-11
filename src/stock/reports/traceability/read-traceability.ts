import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { CONTACT_GROUP_SELECTION, contactGroupValues } from 'src/stock-picking-batch/utils/transfer-partner.util';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { type StockProduct } from 'src/stock/product/types/stock-product.type';
import { TRACEABILITY_MESSAGES } from 'src/stock/reports/traceability/traceability-messages.constant';
import { type TraceabilityAnswer } from 'src/stock/reports/traceability/types/traceability-answer.type';
import { type TraceabilityRequest } from 'src/stock/reports/traceability/types/traceability-request.type';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { findAs } from 'src/stock/stock-person-writes';
import { stockMoveMoveRels } from 'src/stock/stock-records';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type TransferForGroups } from 'src/stock-picking-batch/types/transfer-for-groups.type';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { findDeliveriesByLot, traceabilityLines, traceabilityPrevious } from 'src/stock/utils/traceability.util';
import { type RowFinder } from 'src/stock/types/row-finder.type';
import { type TraceLine } from 'src/stock/utils/types/trace-line.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

type Place = { id: string; completeName: string | null; usage: string } | null;

type LineNode = {
  id: string;
  createdAt: string;
  date: string;
  state: string;
  quantity: number | null;
  productUomId: string | null;
  productId: string;
  lotId: string | null;
  lotName: string | null;
  lot: { name: string | null } | null;
  locationId: string;
  location: Place;
  locationDestId: string;
  locationDest: Place;
  pickingId: string | null;
  moveId: string | null;
};

type MoveNode = {
  id: string;
  date: string;
  isInventory: boolean | null;
  pickingId: string | null;
  scrapId: string | null;
  scrap: { name: string | null } | null;
};

type PickingNode = Pick<TransferForGroups, 'person' | 'company'> & {
  id: string;
  name: string | null;
  pickingTypeCode: string | null;
  pickingType: { code: string | null } | null;
  dateDone: string | null;
};

const LINE_SELECTION = `id createdAt date state quantity productUomId productId lotId lotName pickingId moveId locationId locationDestId
  lot { name deletedAt } location { id completeName usage deletedAt } locationDest { id completeName usage deletedAt }`;
const MOVE_SELECTION = 'id date isInventory pickingId scrapId scrap { name deletedAt }';
const PICKING_SELECTION = `id name pickingTypeCode dateDone pickingType { code deletedAt } ${CONTACT_GROUP_SELECTION}`;

const distinct = (ids: (string | null)[]) => [...new Set(ids.filter((id): id is string => id !== null))];

const findLines = (find: RowFinder, filter: Record<string, unknown>) =>
  find<LineNode>('stockMoveLine', 'stockMoveLines', filter, LINE_SELECTION);

// Lines in the order they were made, so lines of the same date keep it.
const byCreation = (left: LineNode, right: LineNode) =>
  left.createdAt < right.createdAt ? -1 : left.createdAt > right.createdAt ? 1 : left.id < right.id ? -1 : 1;

const readLine = async (find: RowFinder, lineId: string) => (await findLines(find, { id: { eq: lineId } }))[0] ?? null;

const readDoneLinesOfLots = async (find: RowFinder, lotIds: (string | null)[]) =>
  (await readInChunks(distinct(lotIds), (part) => findLines(find, { lotId: { in: part }, state: { eq: MOVE_STATE.DONE } }))).sort(byCreation);

// A transfer's done lines that carry a lot, found through its moves as a
// line's own transfer may be empty.
const readDoneLotLinesOfPicking = async (find: RowFinder, pickingId: string) => {
  const moves = await find<{ id: string }>('stockMove', 'stockMoves', { pickingId: { eq: pickingId } }, 'id');

  return (
    await readInChunks(
      moves.map((move) => move.id),
      (part) => findLines(find, { moveId: { in: part }, state: { eq: MOVE_STATE.DONE }, lotId: { is: 'NOT_NULL' } }),
    )
  ).sort(byCreation);
};

// A variant's name already holds its internal reference.
const productLabel = (product: StockProduct | undefined) => product?.displayName ?? '';

// The quantity in the product's unit and that unit's name. A line whose unit
// cannot be converted keeps its own quantity and shows its own unit's name.
const inProductUnit = (line: LineNode, product: StockProduct | undefined, uoms: Map<string, ResolvedUom>, digits: number) => {
  const quantity = line.quantity ?? 0;
  const lineUomName = line.productUomId === null ? '' : (uoms.get(line.productUomId)?.name ?? '');

  if (product === undefined || line.productUomId === null || !uoms.has(line.productUomId) || !uoms.has(product.uomId)) {
    return { quantity, uomName: lineUomName };
  }
  return {
    quantity: convertQuantity({ qty: quantity, fromUomId: line.productUomId, toUomId: product.uomId, uoms, digits, method: 'HALF-UP' }),
    uomName: uoms.get(product.uomId)?.name ?? '',
  };
};

// The lines as the report reads them, with their moves, transfers, products
// and chain links. Moves and transfers are read as the clicking user; the
// links, products and units are configuration and are read as the app.
const toTraceLines = async (find: RowFinder, lines: LineNode[], digits: number): Promise<TraceLine[]> => {
  const moves = await readInChunks(distinct(lines.map((line) => line.moveId)), (part) =>
    find<MoveNode>('stockMove', 'stockMoves', { id: { in: part } }, MOVE_SELECTION),
  );
  const moveById = new Map(moves.map((move) => [move.id, move]));
  const pickings = await readInChunks(distinct([...lines.map((line) => line.pickingId), ...moves.map((move) => move.pickingId)]), (part) =>
    find<PickingNode>('stockPicking', 'stockPickings', { id: { in: part } }, PICKING_SELECTION),
  );
  const pickingById = new Map(pickings.map((picking) => [picking.id, picking]));
  const links = await readInChunks(
    moves.map((move) => move.id),
    (part) => stockMoveMoveRels.find<{ moveOrigId: string; moveDestId: string }>({ moveDestId: { in: part } }, 'moveOrigId moveDestId'),
  );
  const [products, uoms] = await Promise.all([readStockProducts(lines.map((line) => line.productId)), readResolvedUoms()]);

  return lines.map((line) => {
    const move = line.moveId === null ? undefined : moveById.get(line.moveId);
    const pickingId = line.pickingId ?? move?.pickingId ?? null;
    const picking = pickingId === null ? undefined : pickingById.get(pickingId);
    const product = products.get(line.productId);
    const contact = picking === undefined ? null : contactGroupValues(picking);
    const amount = inProductUnit(line, product, uoms, digits);

    return {
      id: line.id,
      moveId: line.moveId,
      moveDate: move?.date ?? line.date,
      date: line.date,
      state: line.state,
      productId: line.productId,
      productName: productLabel(product),
      lotId: line.lotId,
      lotName: textOrNull(line.lot?.name) ?? textOrNull(line.lotName) ?? '',
      quantityProductUom: amount.quantity,
      uomName: amount.uomName,
      locationId: line.locationId,
      locationName: line.location?.completeName ?? '',
      locationUsage: line.location?.usage ?? '',
      locationDestId: line.locationDestId,
      locationDestName: line.locationDest?.completeName ?? '',
      locationDestUsage: line.locationDest?.usage ?? '',
      pickingId: picking === undefined ? null : picking.id,
      pickingIsOwn: picking !== undefined && picking.id === line.pickingId,
      pickingName: picking === undefined ? null : textOrNull(picking.name),
      pickingTypeCode: picking === undefined ? null : (textOrNull(picking.pickingTypeCode) ?? picking.pickingType?.code ?? null),
      pickingDateDone: picking?.dateDone ?? null,
      partnerId: contact?.partnerKey ?? null,
      partnerName: contact?.partnerName ?? null,
      partnerObject: picking?.person ? 'person' : picking?.company ? 'company' : null,
      isInventory: move?.isInventory === true,
      scrapId: move?.scrapId ?? null,
      scrapName: textOrNull(move?.scrap?.name) ?? null,
      moveOrigIds: links.filter((link) => link.moveDestId === line.moveId).map((link) => link.moveOrigId),
    };
  });
};

const deliveriesOf = (doneLines: TraceLine[]): TraceabilityAnswer['deliveries'] => {
  const { deliveryIds, partnerIds } = findDeliveriesByLot(doneLines);

  return {
    transfers: deliveryIds.map((recordId) => ({
      objectNameSingular: 'stockPicking',
      recordId,
      name: doneLines.find((line) => line.pickingId === recordId)?.pickingName ?? '',
    })),
    customers: partnerIds.flatMap((recordId) => {
      const line = doneLines.find((candidate) => candidate.partnerId === recordId);

      return line?.partnerObject ? [{ objectNameSingular: line.partnerObject, recordId, name: line.partnerName ?? '' }] : [];
    }),
  };
};

// Unfolding a line shows the lines one step upstream of it, among the done
// lines of its lot.
const unfold = async (find: RowFinder, lineId: string, digits: number): Promise<Omit<TraceabilityAnswer, 'digits'>> => {
  const line = await readLine(find, lineId);

  if (line === null) {
    throw new StockUserError(TRACEABILITY_MESSAGES.lineNotFound);
  }
  const doneLines = await toTraceLines(find, line.lotId === null ? [] : await readDoneLinesOfLots(find, [line.lotId]), digits);
  const start = doneLines.find((candidate) => candidate.id === line.id) ?? (await toTraceLines(find, [line], digits))[0];

  return {
    rows: traceabilityLines({ model: 'stockMoveLine', startLines: traceabilityPrevious(start, doneLines), doneLines, digits }),
    deliveries: null,
  };
};

// The start record must be one the reader can read.
const readStart = async (find: RowFinder, model: 'stockPicking' | 'stockLot', recordId: string) => {
  const readable = await find<{ id: string }>(model, model === 'stockLot' ? 'stockLots' : 'stockPickings', { id: { eq: recordId } }, 'id');

  if (readable.length === 0) {
    throw new StockUserError(TRACEABILITY_MESSAGES.notFound);
  }
  return model === 'stockLot' ? null : readDoneLotLinesOfPicking(find, recordId);
};

const buildReport = async (
  request: TraceabilityRequest,
  digits: number,
  find: RowFinder,
): Promise<Omit<TraceabilityAnswer, 'digits'>> => {
  if (request.kind === 'unfold') {
    return unfold(find, request.lineId, digits);
  }
  if (request.model === 'stockMoveLine') {
    const line = await readLine(find, request.recordId);

    if (line === null) {
      throw new StockUserError(TRACEABILITY_MESSAGES.lineNotFound);
    }
    const doneLines = await toTraceLines(find, line.lotId === null ? [] : await readDoneLinesOfLots(find, [line.lotId]), digits);

    return { rows: traceabilityLines({ model: 'stockLot', startLines: doneLines, doneLines, digits }), deliveries: null };
  }
  const pickingLines = await readStart(find, request.model, request.recordId);

  if (pickingLines === null) {
    const doneLines = await toTraceLines(find, await readDoneLinesOfLots(find, [request.recordId]), digits);

    return { rows: traceabilityLines({ model: 'stockLot', startLines: doneLines, doneLines, digits }), deliveries: deliveriesOf(doneLines) };
  }
  const doneLines = await toTraceLines(find, await readDoneLinesOfLots(find, pickingLines.map((line) => line.lotId)), digits);
  const byId = new Map(doneLines.map((line) => [line.id, line]));
  const startLines = pickingLines.flatMap((line) => {
    const found = byId.get(line.id);

    return found === undefined ? [] : [found];
  });

  return { rows: traceabilityLines({ model: 'stockPicking', startLines, doneLines, digits }), deliveries: null };
};

// A lot lists every done line of the lot. A done transfer lists its lines
// that carry a lot, each one able to unfold upstream. A move line opens the
// report of its lot. Lines, moves and transfers are read as the clicking user
// unless a print hands its own reader.
export const traceabilityReport = async (
  request: TraceabilityRequest,
  digits: number,
  find: RowFinder = findAs('person'),
): Promise<TraceabilityAnswer> => ({
  ...(await buildReport(request, digits, find)),
  digits,
});
