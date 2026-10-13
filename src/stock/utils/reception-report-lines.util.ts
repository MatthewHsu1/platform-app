import { MOVE_STATE, PICKING_STATE, PICKING_TYPE_CODE, PRIORITY } from 'src/stock/stock-options.constant';
import { type MoveState } from 'src/stock/types/move-state.type';
import { compareAtDigits, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ReceptionDoc } from 'src/stock/utils/types/reception-doc.type';
import { type ReceptionLine } from 'src/stock/utils/types/reception-line.type';
import { type ReceptionMove } from 'src/stock/utils/types/reception-move.type';
import { type ReceptionReportResult } from 'src/stock/utils/types/reception-report-result.type';
import { type ReceptionSource } from 'src/stock/utils/types/reception-source.type';

export const RECEPTION_NO_TRANSFERS_MESSAGE = 'No transfers selected or a delivery order selected';
export const RECEPTION_MIXED_STATES_MESSAGE =
  'This report cannot be used for done and not done transfers at the same time';

const OPEN_OUT_STATES: MoveState[] = [MOVE_STATE.CONFIRMED, MOVE_STATE.PARTIALLY_AVAILABLE, MOVE_STATE.WAITING];

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const compareTime = (left: string, right: string) => Date.parse(left) - Date.parse(right);

// Reservation date first (none last, as a database orders an ascending
// column), then urgent first, then date, then the older move.
const byReservationOrder = (left: ReceptionMove, right: ReceptionMove) => {
  if (left.reservationDate !== right.reservationDate) {
    if (left.reservationDate === null) {
      return 1;
    }
    if (right.reservationDate === null) {
      return -1;
    }
    return compareText(left.reservationDate, right.reservationDate);
  }
  const urgentRank = (move: ReceptionMove) => (move.priority === PRIORITY.URGENT ? 0 : 1);

  return (
    urgentRank(left) - urgentRank(right) ||
    compareTime(left.date, right.date) ||
    compareText(left.createdAt, right.createdAt)
  );
};

const addTo = (totals: Map<string, number>, key: string, value: number) =>
  totals.set(key, (totals.get(key) ?? 0) + value);

export const receptionReportLines = ({
  docs,
  moves,
  warehouseLocationIds,
  digits,
}: {
  docs: ReceptionDoc[];
  moves: ReceptionMove[];
  warehouseLocationIds: Set<string>;
  digits: number;
}): ReceptionReportResult => {
  const isZero = (value: number) => isZeroAtDigits(value, digits);
  const compare = (left: number, right: number) => compareAtDigits(left, right, digits);
  const usable = docs.filter(
    (doc) => doc.pickingTypeCode !== PICKING_TYPE_CODE.OUTGOING && doc.state !== PICKING_STATE.CANCEL,
  );

  if (usable.length === 0) {
    return { kind: 'refused', reason: RECEPTION_NO_TRANSFERS_MESSAGE };
  }
  const states = usable.map((doc) => doc.state);
  const isDone = states.includes(PICKING_STATE.DONE);

  if (isDone && new Set(states).size > 1) {
    return { kind: 'refused', reason: RECEPTION_MIXED_STATES_MESSAGE };
  }
  const docIds = new Set(usable.map((doc) => doc.id));
  const byId = new Map(moves.map((move) => [move.id, move]));
  const inMoves = moves.filter(
    (move) =>
      move.pickingId !== null && docIds.has(move.pickingId) && move.isStorable && move.state !== MOVE_STATE.CANCEL,
  );

  // Several selected receipts can feed the same outgoing move, so its demand
  // is shared out across them in turn rather than counted once per receipt.
  const linkedPool = new Map<string, number>();

  for (const destinationId of new Set(inMoves.flatMap((move) => move.moveDestIds))) {
    const destination = byId.get(destinationId);

    if (destination !== undefined) {
      addTo(linkedPool, destination.productId, destination.productQty);
    }
  }

  const totalLinked = new Map<string, { quantity: number; inIds: string[] }>();
  const toAssign = new Map<string, { quantity: number; moveId: string }[]>();
  const draft = new Map<string, number>();

  for (const move of inMoves) {
    // A move made from a line on a transfer has no demand, only a quantity.
    const moveQuantity = move.productQty || move.quantity;
    let alreadyLinked = 0;

    if (move.moveDestIds.length > 0) {
      alreadyLinked = Math.min(linkedPool.get(move.productId) ?? 0, moveQuantity);
      addTo(linkedPool, move.productId, -alreadyLinked);
    }
    if (alreadyLinked !== 0) {
      const total = totalLinked.get(move.productId) ?? { quantity: 0, inIds: [] };

      totalLinked.set(move.productId, { quantity: total.quantity + alreadyLinked, inIds: [...total.inIds, move.id] });
    }
    if (moveQuantity !== alreadyLinked) {
      if (move.state === MOVE_STATE.DRAFT) {
        addTo(draft, move.productId, moveQuantity - alreadyLinked);
      } else {
        toAssign.set(move.productId, [
          ...(toAssign.get(move.productId) ?? []),
          { quantity: moveQuantity - alreadyLinked, moveId: move.id },
        ]);
      }
    }
  }

  // Already reserved outgoing moves can only take quantities that are in stock.
  const allowedStates = isDone ? [...OPEN_OUT_STATES, MOVE_STATE.ASSIGNED] : OPEN_OUT_STATES;
  const products = new Set([...toAssign.keys(), ...draft.keys()]);
  const candidates = moves
    .filter(
      (move) =>
        allowedStates.includes(move.state) &&
        move.productQty > 0 &&
        warehouseLocationIds.has(move.locationId) &&
        move.moveOrigIds.length === 0 &&
        products.has(move.productId) &&
        !(move.pickingId !== null && docIds.has(move.pickingId)),
    )
    .sort(byReservationOrder);
  const outsByProduct = new Map<string, ReceptionMove[]>();

  for (const candidate of candidates) {
    outsByProduct.set(candidate.productId, [...(outsByProduct.get(candidate.productId) ?? []), candidate]);
  }

  const sources = new Map<string, ReceptionSource>();
  const addLine = (out: ReceptionMove & { pickingId: string }, line: ReceptionLine) => {
    const source = sources.get(out.pickingId) ?? {
      pickingId: out.pickingId,
      pickingName: out.pickingName ?? '',
      scheduledDate: out.pickingScheduledDate,
      lines: [],
    };

    source.lines.push(line);
    sources.set(out.pickingId, source);
  };
  const hasPicking = (move: ReceptionMove): move is ReceptionMove & { pickingId: string } => move.pickingId !== null;

  for (const [productId, outs] of outsByProduct) {
    for (const out of outs) {
      if (!hasPicking(out)) {
        continue;
      }
      let quantityToReserve = out.productQty;

      if (!isDone && out.state === MOVE_STATE.PARTIALLY_AVAILABLE) {
        quantityToReserve -= out.quantity;
      }
      let quantity = 0;
      const moveInIds: string[] = [];
      const queue = toAssign.get(productId) ?? [];

      while (queue.length > 0) {
        const head = queue[0];
        let added: number;

        moveInIds.push(head.moveId);
        if (compare(quantity + head.quantity, quantityToReserve) <= 0) {
          added = head.quantity;
          head.quantity = 0;
        } else {
          added = quantityToReserve - quantity;
          head.quantity -= added;
        }
        quantity += added;
        if (head.quantity === 0) {
          queue.shift();
        }
        if (compare(quantityToReserve, quantity) === 0) {
          break;
        }
      }
      if (!isZero(quantity)) {
        addLine(out, { productId, quantity, moveOutId: out.id, moveInIds, isQtyAssignable: true, isAssigned: false });
      }

      // Draft quantities are shown so staff see what is coming, but they
      // cannot be allocated until their receipt is confirmed.
      const expected = draft.get(productId) ?? 0;

      if (compare(quantityToReserve, quantity) > 0 && !isZero(expected)) {
        const toExpect = Math.min(expected, quantityToReserve - quantity);

        addLine(out, {
          productId,
          quantity: toExpect,
          moveOutId: out.id,
          moveInIds: [],
          isQtyAssignable: false,
          isAssigned: false,
        });
        draft.set(productId, expected - toExpect);
      }
    }
  }

  for (const [productId, { quantity: total, inIds }] of totalLinked) {
    const outIds = [...new Set(inIds.flatMap((inId) => byId.get(inId)?.moveDestIds ?? []))];

    for (const outId of outIds) {
      const out = byId.get(outId);

      // The total is not shared out per outgoing move: with several receipts
      // linked to the same moves there is no telling which part is whose.
      if (out === undefined || isZero(total) || !hasPicking(out)) {
        continue;
      }
      addLine(out, {
        productId,
        quantity: Math.min(total, out.productQty),
        moveOutId: out.id,
        moveInIds: inIds,
        isQtyAssignable: true,
        isAssigned: true,
      });
    }
  }

  return { kind: 'lines', docIds: [...docIds], sources: [...sources.values()] };
};
