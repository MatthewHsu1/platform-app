import { compareText } from 'src/shared/utils/compare-text.util';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { type AllocationInputs } from 'src/stock/reports/reception/types/allocation-inputs.type';
import { type AllocationRequest } from 'src/stock/reports/reception/types/allocation-request.type';
import { type ReceptionData } from 'src/stock/reports/reception/types/reception-data.type';
import { readMoveReferences } from 'src/stock/move/move-links';
import { LOCATION_USAGE, MOVE_STATE, PICKING_STATE, PICKING_TYPE_CODE, PRIORITY } from 'src/stock/stock-options.constant';
import { findAs } from 'src/stock/stock-person-writes';
import {
  stockLocations,
  stockMoveLines,
  stockMoveMoveRels,
  stockMoves,
  stockPickingTypes,
  stockWarehouses,
} from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type Priority } from 'src/stock/types/priority.type';
import { type RowFinder } from 'src/stock/types/row-finder.type';
import { lineQuantityInProductUnit } from 'src/stock/utils/line-quantity-in-product-unit.util';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type AllocationIn } from 'src/stock/utils/types/allocation-in.type';
import { type ReceptionMove } from 'src/stock/utils/types/reception-move.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

type PickingNode = {
  id: string;
  name: string | null;
  state: PickingState;
  priority: Priority;
  scheduledDate: string | null;
  createdAt: string;
  pickingTypeId: string | null;
  pickingTypeCode: PickingTypeCode | null;
};

type MoveNode = {
  id: string;
  createdAt: string;
  sequence: number | null;
  productId: string;
  state: MoveState;
  productQty: number | null;
  quantity: number | null;
  productUomId: string | null;
  date: string;
  reservationDate: string | null;
  priority: Priority;
  locationId: string | null;
  locationDestId: string | null;
  pickingId: string | null;
};

type LineNode = {
  id: string;
  createdAt: string;
  moveId: string | null;
  quantity: number | null;
  quantityProductUom: number | null;
  productUomId: string | null;
  locationId: string | null;
  resultPackageId: string | null;
};

type Link = { moveOrigId: string; moveDestId: string };

const PICKING_SELECTION = 'id name state priority scheduledDate createdAt pickingTypeId pickingTypeCode';
const MOVE_SELECTION =
  'id createdAt sequence productId state productQty quantity productUomId date reservationDate priority locationId locationDestId pickingId';
const CANDIDATE_STATES: MoveState[] = [
  MOVE_STATE.CONFIRMED,
  MOVE_STATE.PARTIALLY_AVAILABLE,
  MOVE_STATE.WAITING,
  MOVE_STATE.ASSIGNED,
];

const distinct = (ids: string[]) => [...new Set(ids)];


const readPickings = (find: RowFinder, filter: (ids: string[]) => Record<string, unknown>, ids: string[]) =>
  readInChunks(distinct(ids), (part) => find<PickingNode>('stockPicking', 'stockPickings', filter(part), PICKING_SELECTION));

const readMoves = (find: RowFinder, filter: (ids: string[]) => Record<string, unknown>, ids: string[]) =>
  readInChunks(distinct(ids), (part) => find<MoveNode>('stockMove', 'stockMoves', filter(part), MOVE_SELECTION));

// Both directions of every link touching these moves.
const readLinks = async (moveIds: string[]) => {
  const rows = await readInChunks(distinct(moveIds), (part) =>
    stockMoveMoveRels.find<Link>({ or: [{ moveOrigId: { in: part } }, { moveDestId: { in: part } }] }, 'moveOrigId moveDestId'),
  );

  return [...new Map(rows.map((row) => [`${row.moveOrigId}|${row.moveDestId}`, row])).values()];
};

// Transfers in the order a transfer list shows them: urgent first, then by
// scheduled date (none last), then the newest.
const byTransferOrder = (left: PickingNode, right: PickingNode) => {
  const urgentRank = (picking: PickingNode) => (picking.priority === PRIORITY.URGENT ? 0 : 1);

  if (urgentRank(left) !== urgentRank(right)) {
    return urgentRank(left) - urgentRank(right);
  }
  if (left.scheduledDate !== right.scheduledDate) {
    if (left.scheduledDate === null) {
      return 1;
    }
    if (right.scheduledDate === null) {
      return -1;
    }
    return Date.parse(left.scheduledDate) - Date.parse(right.scheduledDate);
  }
  return compareText(right.createdAt, left.createdAt);
};

// Moves of one transfer in their sequence, then the older first.
const byMoveOrder = (left: { sequence: number | null; createdAt: string }, right: { sequence: number | null; createdAt: string }) =>
  (left.sequence ?? 0) - (right.sequence ?? 0) || compareText(left.createdAt, right.createdAt);

const inProductUnit = (uoms: Map<string, ResolvedUom>, quantity: number, fromUomId: string | null, toUomId: string | undefined) =>
  fromUomId === null || toUomId === undefined || !uoms.has(fromUomId) || !uoms.has(toUomId)
    ? quantity
    : convertQuantity({ qty: quantity, fromUomId, toUomId, uoms, digits: readStockSettings().productUnitDigits, method: 'HALF-UP' });

// The warehouse of the first transfer, without its supplier locations: only
// deliveries leaving from there can take the goods.
const readWarehouseLocationIds = async (pickingTypeId: string | null) => {
  const [type] =
    pickingTypeId === null ? [] : await stockPickingTypes.find<{ warehouseId: string | null }>({ id: { eq: pickingTypeId } }, 'warehouseId');
  const [warehouse] =
    type?.warehouseId === null || type === undefined
      ? []
      : await stockWarehouses.find<{ viewLocationId: string | null }>({ id: { eq: type.warehouseId } }, 'viewLocationId');
  const [view] =
    warehouse?.viewLocationId === null || warehouse === undefined
      ? []
      : await stockLocations.find<{ parentPath: string | null }>({ id: { eq: warehouse.viewLocationId } }, 'parentPath');

  if (view?.parentPath === null || view === undefined) {
    return new Set<string>();
  }
  const tree = await stockLocations.find<{ id: string; usage: string }>({ parentPath: { like: `${view.parentPath}%` } }, 'id usage');

  return new Set(tree.filter((location) => location.usage !== LOCATION_USAGE.SUPPLIER).map((location) => location.id));
};

const readTypeCodes = async (pickings: PickingNode[]) => {
  const typeIds = distinct(pickings.flatMap((picking) => (picking.pickingTypeCode === null && picking.pickingTypeId !== null ? [picking.pickingTypeId] : [])));
  const types = typeIds.length === 0 ? [] : await stockPickingTypes.find<{ id: string; code: PickingTypeCode }>({ id: { in: typeIds } }, 'id code');
  const codeOf = new Map(types.map((type) => [type.id, type.code]));

  return (picking: PickingNode) => picking.pickingTypeCode ?? (picking.pickingTypeId === null ? null : (codeOf.get(picking.pickingTypeId) ?? null));
};

// A variant's name already holds its internal reference.
const productLabel = (product: { displayName: string }) => product.displayName;

// The reception report's data for the selected transfers or a batch, read as
// the clicking user unless a print hands its own reader. Transfers and moves
// come in the order the report walks them, as their lists order them.
export const readReceptionData = async (
  { pickingIds, batchId }: { pickingIds: string[]; batchId: string | null },
  find: RowFinder = findAs('person'),
): Promise<ReceptionData> => {
  const docRows = (
    batchId === null
      ? await readPickings(find, (part) => ({ id: { in: part } }), pickingIds)
      : await find<PickingNode>('stockPicking', 'stockPickings', { batchId: { eq: batchId } }, PICKING_SELECTION)
  ).sort(byTransferOrder);
  const codeOf = await readTypeCodes(docRows);
  const docs = docRows.flatMap((doc) => {
    const code = codeOf(doc);

    return code === null ? [] : [{ id: doc.id, state: doc.state, pickingTypeCode: code }];
  });
  const firstUsable = docRows.find((doc) => codeOf(doc) !== PICKING_TYPE_CODE.OUTGOING && doc.state !== PICKING_STATE.CANCEL);
  const warehouseLocationIds = await readWarehouseLocationIds(firstUsable?.pickingTypeId ?? null);
  const docRank = new Map(docRows.map((doc, index) => [doc.id, index]));
  const docMoves = (await readMoves(find, (part) => ({ pickingId: { in: part } }), docRows.map((doc) => doc.id))).sort(
    (left, right) => (docRank.get(left.pickingId ?? '') ?? 0) - (docRank.get(right.pickingId ?? '') ?? 0) || byMoveOrder(left, right),
  );
  const candidates = await readMoves(
    find,
    (part) => ({ productId: { in: part }, state: { in: CANDIDATE_STATES }, productQty: { gt: 0 } }),
    docMoves.map((move) => move.productId),
  );
  const links = await readLinks([...docMoves, ...candidates].map((move) => move.id));
  const known = new Set([...docMoves, ...candidates].map((move) => move.id));
  const docMoveIds = new Set(docMoves.map((move) => move.id));
  const destMoves = await readMoves(
    find,
    (part) => ({ id: { in: part } }),
    links.filter((link) => docMoveIds.has(link.moveOrigId) && !known.has(link.moveDestId)).map((link) => link.moveDestId),
  );
  const all = [...new Map([...docMoves, ...candidates, ...destMoves].map((move) => [move.id, move])).values()];
  const otherPickings = await readPickings(
    find,
    (part) => ({ id: { in: part } }),
    all.flatMap((move) => (move.pickingId === null || docRank.has(move.pickingId) ? [] : [move.pickingId])),
  );
  const pickingById = new Map([...docRows, ...otherPickings].map((picking) => [picking.id, picking]));
  const byId = new Map(all.map((move) => [move.id, move]));
  const [products, uoms] = await Promise.all([readStockProducts(all.map((move) => move.productId)), readResolvedUoms()]);
  const moves: ReceptionMove[] = all.map((move) => {
    const picking = move.pickingId === null ? undefined : pickingById.get(move.pickingId);

    return {
      id: move.id,
      createdAt: move.createdAt,
      productId: move.productId,
      isStorable: products.get(move.productId)?.isStorable === true,
      state: move.state,
      productQty: move.productQty ?? 0,
      quantity: inProductUnit(uoms, move.quantity ?? 0, move.productUomId, products.get(move.productId)?.uomId),
      date: move.date,
      reservationDate: move.reservationDate,
      priority: move.priority,
      locationId: move.locationId ?? '',
      pickingId: move.pickingId,
      pickingName: picking?.name ?? null,
      pickingScheduledDate: picking?.scheduledDate ?? null,
      moveOrigIds: links.filter((link) => link.moveDestId === move.id).map((link) => link.moveOrigId),
      moveDestIds: links
        .filter((link) => link.moveOrigId === move.id)
        .map((link) => link.moveDestId)
        .sort((left, right) => {
          const leftMove = byId.get(left);
          const rightMove = byId.get(right);

          return leftMove === undefined || rightMove === undefined ? 0 : byMoveOrder(leftMove, rightMove);
        }),
    };
  });

  return {
    docs,
    moves,
    warehouseLocationIds,
    urgentPickingIds: [...pickingById.values()].filter((picking) => picking.priority === PRIORITY.URGENT).map((picking) => picking.id),
    products: Object.fromEntries(
      [...products.values()].map((product) => [
        product.productId,
        { name: productLabel(product), uomName: uoms.get(product.uomId)?.name ?? '' },
      ]),
    ),
  };
};

// The pickings of these moves, as the app: a cheap read that decides which
// transfers an allocation holds before anything else is read.
export const readMovePickingIds = async (moveIds: string[]) => {
  const rows = await readInChunks(distinct(moveIds), (part) =>
    stockMoves.find<{ id: string; pickingId: string | null }>({ id: { in: part } }, 'id pickingId'),
  );

  return new Map(rows.map((row) => [row.id, row.pickingId]));
};

// Delivery lines in their list order: lines not put in a package first (as a
// database orders a descending column), then by package, then the older first.
const byLineOrder = (left: LineNode, right: LineNode) => {
  if ((left.resultPackageId === null) !== (right.resultPackageId === null)) {
    return left.resultPackageId === null ? -1 : 1;
  }
  return compareText(right.resultPackageId ?? '', left.resultPackageId ?? '') || compareText(left.createdAt, right.createdAt);
};

// Everything an allocation plans from, read as the app once the transfers are
// held, so no other run changes them between this read and the writes. The
// route has checked the user can read every move asked for.
export const readAllocationInputs = async (request: AllocationRequest): Promise<AllocationInputs> => {
  const outIds = distinct(request.map((entry) => entry.moveId));
  const inIds = distinct(request.flatMap((entry) => entry.inIds));
  const asked = await readInChunks(distinct([...outIds, ...inIds]), (part) => stockMoves.find<MoveNode>({ id: { in: part } }, MOVE_SELECTION));
  const links = await readLinks(asked.map((move) => move.id));
  const askedIds = new Set(asked.map((move) => move.id));
  const linked = await readInChunks(
    distinct(links.flatMap((link) => [link.moveOrigId, link.moveDestId]).filter((id) => !askedIds.has(id))),
    (part) => stockMoves.find<{ id: string; productQty: number | null }>({ id: { in: part } }, 'id productQty'),
  );
  const [lineRows, references, products, uoms] = await Promise.all([
    readInChunks(outIds, (part) =>
      stockMoveLines.find<LineNode>(
        { moveId: { in: part } },
        'id createdAt moveId quantity quantityProductUom productUomId locationId resultPackageId',
      ),
    ),
    readMoveReferences(asked.map((move) => move.id)),
    readStockProducts(asked.map((move) => move.productId)),
    readResolvedUoms(),
  ]);
  const digits = readStockSettings().productUnitDigits;
  const byId = new Map(asked.map((move) => [move.id, move]));
  const demandOf = new Map<string, number>([
    ...asked.map((move): [string, number] => [move.id, move.productQty ?? 0]),
    ...linked.map((move): [string, number] => [move.id, move.productQty ?? 0]),
  ]);
  const lines: AllocationInputs['lines'] = new Map();

  const allocations = request.flatMap((entry) => {
    const out = byId.get(entry.moveId);

    if (out === undefined) {
      return [];
    }
    const productUnitUomId = products.get(out.productId)?.uomId ?? null;
    const outLines = lineRows.filter((line) => line.moveId === out.id).sort(byLineOrder);

    for (const line of outLines) {
      const lineUomId = line.productUomId ?? out.productUomId;

      if (lineUomId !== null && productUnitUomId !== null) {
        lines.set(line.id, { quantity: line.quantity ?? 0, productUomId: lineUomId, productUnitUomId });
      }
    }
    const ins = entry.inIds.flatMap((inId): AllocationIn[] => {
      const incoming = byId.get(inId);

      if (incoming === undefined) {
        return [];
      }
      const destinations = links.filter((link) => link.moveOrigId === inId).map((link) => link.moveDestId);

      return [
        {
          id: incoming.id,
          productId: incoming.productId,
          productQty: incoming.productQty ?? 0,
          quantity: inProductUnit(uoms, incoming.quantity ?? 0, incoming.productUomId, products.get(incoming.productId)?.uomId),
          state: incoming.state,
          locationDestId: incoming.locationDestId ?? '',
          destDemand: destinations.reduce((total, id) => total + (demandOf.get(id) ?? 0), 0),
          pickingId: incoming.pickingId,
          referenceIds: references.get(incoming.id) ?? [],
          isLinkedToOut: destinations.includes(out.id),
        },
      ];
    });

    return [
      {
        out: {
          id: out.id,
          productId: out.productId,
          productQty: out.productQty ?? 0,
          quantity: inProductUnit(uoms, out.quantity ?? 0, out.productUomId, productUnitUomId ?? undefined),
          state: out.state,
          reservationDate: out.reservationDate,
          pickingId: out.pickingId,
          referenceIds: references.get(out.id) ?? [],
          lines: outLines.map((line) => ({
            id: line.id,
            quantityProductUom: lineQuantityInProductUnit({ line, productUomId: productUnitUomId, uoms, digits }),
            locationId: line.locationId ?? out.locationId ?? '',
          })),
          moveOrigs: links
            .filter((link) => link.moveDestId === out.id)
            .map((link) => ({ id: link.moveOrigId, productQty: demandOf.get(link.moveOrigId) ?? 0 })),
        },
        quantity: entry.quantity,
        ins,
      },
    ];
  });

  return { allocations, lines };
};
