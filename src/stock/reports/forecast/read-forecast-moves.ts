import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { dayOf } from 'src/stock/orderpoint/utils/day.util';
import { type ForecastMoveNode } from 'src/stock/reports/forecast/types/forecast-move-node.type';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { findReadableAsPerson } from 'src/stock/stock-person-writes';
import { stockMoveMoveRels } from 'src/stock/stock-records';
import { isForecastIn, isForecastOut } from 'src/stock/utils/forecast-lines.util';
import { OPEN_MOVE_STATES_FOR_FORECAST } from 'src/stock/utils/plan-product-quantities.util';
import { type ForecastMove } from 'src/stock/utils/types/forecast-move.type';

type Link = { moveOrigId: string; moveDestId: string };

const MOVE_SELECTION =
  'id createdAt productId state productQty quantity productUomId date reservationDate priority locationId locationDestId locationFinalId pickingId picking { deletedAt name }';
// A chain longer than this many steps is cut; the report says so.
const CHAIN_ROUNDS = 20;

const distinct = (ids: string[]) => [...new Set(ids)];

export const readMovesAsPerson = (filter: (part: string[]) => Record<string, unknown>, ids: string[]) =>
  readInChunks(distinct(ids), (part) =>
    findReadableAsPerson<ForecastMoveNode>('stockMoves', 'StockMoveFilterInput', filter(part), MOVE_SELECTION),
  );

// The moves the report reads and the links between them. Moves the person
// cannot read are left out, and the chain stops there.
const makeChainReader = (seed: ForecastMoveNode[]) => {
  const moves = new Map(seed.map((move) => [move.id, move]));
  const origins = new Map<string, Set<string>>();
  const destinations = new Map<string, Set<string>>();
  let truncated = false;

  const addTo = (index: Map<string, Set<string>>, key: string, value: string) => {
    index.set(key, (index.get(key) ?? new Set()).add(value));
  };

  const readLinks = async (ids: string[], side: 'moveOrigId' | 'moveDestId') => {
    const rows = await readInChunks(distinct(ids), (part) =>
      stockMoveMoveRels.find<Link>({ [side]: { in: part } }, 'moveOrigId moveDestId'),
    );

    for (const row of rows) {
      addTo(origins, row.moveDestId, row.moveOrigId);
      addTo(destinations, row.moveOrigId, row.moveDestId);
    }
    return rows;
  };

  const readMissing = async (ids: string[]) => {
    const found = await readMovesAsPerson((part) => ({ id: { in: part } }), ids.filter((id) => !moves.has(id)));

    for (const move of found) {
      moves.set(move.id, move);
    }
  };

  // Follows the chain from the start moves toward their origins or their
  // destinations; `stopIds` end the walk.
  const walk = async (startIds: string[], toward: 'origins' | 'destinations', stopIds: Set<string>) => {
    const visited = new Set(startIds);
    let frontier = startIds;
    let rounds = 0;

    while (frontier.length > 0 && rounds < CHAIN_ROUNDS) {
      rounds += 1;
      const rows = await readLinks(frontier, toward === 'origins' ? 'moveDestId' : 'moveOrigId');
      const next = distinct(rows.map((row) => (toward === 'origins' ? row.moveOrigId : row.moveDestId))).filter(
        (id) => !visited.has(id) && !stopIds.has(id),
      );

      for (const id of next) {
        visited.add(id);
      }
      await readMissing(next);
      frontier = next.filter((id) => moves.has(id));
    }
    if (frontier.length > 0) {
      truncated = true;
    }
    return [...visited];
  };

  const readable = (ids: Set<string> | undefined) => [...(ids ?? [])].filter((id) => moves.has(id));
  const sidesOf = (moveId: string) => ({
    moveOrigIds: readable(origins.get(moveId)),
    moveDestIds: readable(destinations.get(moveId)),
  });

  return { moves, walk, readLinks, readMissing, sidesOf, isTruncated: () => truncated };
};

// The open and draft moves of the products, with the chains the report
// follows: every move before a delivery back to the receipts, the moves those
// feed besides it, and every move after a receipt.
export const readForecastMoves = async ({
  productIds,
  warehouseLocationIds,
  toProductUnit,
}: {
  productIds: string[];
  warehouseLocationIds: Set<string>;
  toProductUnit: (move: ForecastMoveNode) => number;
}) => {
  const live = await readMovesAsPerson(
    (part) => ({ productId: { in: part }, state: { in: [MOVE_STATE.DRAFT, ...OPEN_MOVE_STATES_FOR_FORECAST] } }),
    productIds,
  );
  const chain = makeChainReader(live);
  const bare = (move: ForecastMoveNode) => toForecastMove(move, { moveOrigIds: [], moveDestIds: [] }, toProductUnit);
  const open = live.filter((move) => OPEN_MOVE_STATES_FOR_FORECAST.includes(move.state));
  const inIds = open.filter((move) => isForecastIn(bare(move), warehouseLocationIds)).map((move) => move.id);
  const outIds = open.filter((move) => isForecastOut(bare(move), warehouseLocationIds)).map((move) => move.id);
  const linkedIds = await chain.walk(outIds, 'origins', new Set(inIds));
  const linkedOrigins = linkedIds.flatMap((id) => chain.sidesOf(id).moveOrigIds);

  // A chained move only takes what its origins brought, less what their other
  // destinations took: read those siblings too.
  const siblingLinks = await chain.readLinks(linkedOrigins, 'moveOrigId');

  await chain.readMissing(siblingLinks.map((link) => link.moveDestId));
  await chain.walk(inIds, 'destinations', new Set());

  return {
    live: live.map((move) => toForecastMove(move, chain.sidesOf(move.id), toProductUnit)),
    moves: [...chain.moves.values()].map((move) => toForecastMove(move, chain.sidesOf(move.id), toProductUnit)),
    truncated: chain.isTruncated(),
  };
};

export const toForecastMove = (
  move: ForecastMoveNode,
  sides: { moveOrigIds: string[]; moveDestIds: string[] },
  toProductUnit: (move: ForecastMoveNode) => number,
): ForecastMove => ({
  id: move.id,
  createdAt: move.createdAt,
  productId: move.productId,
  state: move.state,
  productQty: move.productQty ?? 0,
  quantity: toProductUnit(move),
  date: move.date,
  reservationDate: move.reservationDate ? dayOf(move.reservationDate) : null,
  priority: move.priority,
  locationId: move.locationId ?? '',
  locationDestId: move.locationDestId ?? '',
  locationFinalId: move.locationFinalId,
  pickingId: move.pickingId,
  pickingName: move.picking?.name ?? null,
  moveOrigIds: sides.moveOrigIds,
  moveDestIds: sides.moveDestIds,
});
