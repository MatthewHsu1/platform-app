import { floatRound } from 'src/shared/utils/float-round.util';
import { MOVE_STATE, PRIORITY } from 'src/stock/stock-options.constant';
import { type MoveState } from 'src/stock/types/move-state.type';
import { OPEN_MOVE_STATES_FOR_FORECAST } from 'src/stock/utils/plan-product-quantities.util';
import { rollupMoves } from 'src/stock/utils/rollup-moves.util';
import { compareAtDigits, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ForecastExpiry } from 'src/stock/utils/types/forecast-expiry.type';
import { type ForecastLine } from 'src/stock/utils/types/forecast-line.type';
import { type ForecastMove } from 'src/stock/utils/types/forecast-move.type';
import { type ForecastQuant } from 'src/stock/utils/types/forecast-quant.type';

type OutData = { reserved: number; reservedMove: ForecastMove | null; taken: number };

const RESERVED_STATES: MoveState[] = [MOVE_STATE.PARTIALLY_AVAILABLE, MOVE_STATE.ASSIGNED];
const NOT_TAKING_STATES: MoveState[] = [MOVE_STATE.DRAFT, MOVE_STATE.CANCEL, MOVE_STATE.ASSIGNED, MOVE_STATE.DONE];

export const isForecastIn = (move: ForecastMove, warehouseLocationIds: Set<string>) =>
  move.productQty !== 0 && !warehouseLocationIds.has(move.locationId) && warehouseLocationIds.has(move.locationDestId);

export const isForecastOut = (move: ForecastMove, warehouseLocationIds: Set<string>) =>
  move.productQty !== 0 &&
  warehouseLocationIds.has(move.locationId) &&
  (!warehouseLocationIds.has(move.locationDestId) ||
    (move.locationFinalId !== null && !warehouseLocationIds.has(move.locationFinalId)));

export const forecastDraftQuantities = ({
  moves,
  warehouseLocationIds,
}: {
  moves: ForecastMove[];
  warehouseLocationIds: Set<string>;
}) => {
  const totals = new Map<string, { in: number; out: number }>();

  for (const move of moves) {
    if (move.state !== MOVE_STATE.DRAFT) {
      continue;
    }
    const total = totals.get(move.productId) ?? { in: 0, out: 0 };

    if (isForecastIn(move, warehouseLocationIds)) {
      total.in += move.productQty;
    } else if (isForecastOut(move, warehouseLocationIds)) {
      total.out += move.productQty;
    }
    totals.set(move.productId, total);
  }

  return totals;
};

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const compareTime = (left: string, right: string) => Date.parse(left) - Date.parse(right);
const isBefore = (left: string, right: string) => compareTime(left, right) < 0;

// Nulls sort last, as a database orders an ascending column.
const compareNullableDay = (left: string | null, right: string | null) =>
  left === right ? 0 : left === null ? 1 : right === null ? -1 : compareText(left, right);

const priorityRank = (move: ForecastMove) => (move.priority === PRIORITY.URGENT ? 0 : 1);
const byPriorityThenDate = (left: ForecastMove, right: ForecastMove) =>
  priorityRank(left) - priorityRank(right) ||
  compareTime(left.date, right.date) ||
  compareText(left.createdAt, right.createdAt);

// Deliveries due for reservation by today come first in priority and date
// order; the others follow by reservation date, and those with none
// (reserved by hand only) come last.
const orderOuts = (outs: ForecastMove[], today: string) => {
  const isDue = (move: ForecastMove) => move.reservationDate !== null && move.reservationDate <= today;
  const due = outs.filter(isDue).sort(byPriorityThenDate);
  const later = outs
    .filter((move) => !isDue(move))
    .sort(
      (left, right) =>
        compareNullableDay(left.reservationDate, right.reservationDate) || byPriorityThenDate(left, right),
    );

  return [...due, ...later];
};

const pushTo = <TValue>(map: Map<string, TValue[]>, key: string, value: TValue) => {
  map.set(key, [...(map.get(key) ?? []), value]);
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const forecastLines = (input: {
  productIds: string[];
  moves: ForecastMove[];
  quants: ForecastQuant[];
  warehouseLocationIds: Set<string>;
  stockLocationId: string;
  stockSubLocationIds: Set<string>;
  today: string;
  now: string;
  digits: number;
  matchMoveIds?: string[];
  expiry?: ForecastExpiry;
}): ForecastLine[] => {
  const { warehouseLocationIds, stockLocationId, stockSubLocationIds, digits } = input;
  const step = 10 ** -digits;
  const isZero = (value: number) => isZeroAtDigits(value, digits);
  const matched = new Set(input.matchMoveIds ?? []);
  const requested = new Set(input.productIds);
  const byId = new Map(input.moves.map((move) => [move.id, move]));
  const movesOf = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? []);
  const live = input.moves.filter(
    (move) => requested.has(move.productId) && OPEN_MOVE_STATES_FOR_FORECAST.includes(move.state),
  );
  const outs = orderOuts(
    live.filter((move) => isForecastOut(move, warehouseLocationIds)),
    input.today,
  );
  const ins = live.filter((move) => isForecastIn(move, warehouseLocationIds)).sort(byPriorityThenDate);
  const inIds = new Set(ins.map((move) => move.id));

  // The chain behind a delivery stops at the receipts: what feeds them is
  // still outside the warehouse.
  const linkedMoves = new Map(
    outs.map((out) => [out.id, movesOf(rollupMoves([out.id], (id) => byId.get(id)?.moveOrigIds ?? [], new Set(inIds)))]),
  );

  const inQuantity = new Map(ins.map((move) => [move.id, move.productQty]));
  const inDestinations = new Map<string, string[]>();
  const insByDestination = new Map<string, string[]>();
  const insByProduct = new Map<string, string[]>();

  for (const move of ins) {
    const destinations = rollupMoves([move.id], (id) => byId.get(id)?.moveDestIds ?? [], new Set());

    inDestinations.set(move.id, destinations);
    pushTo(insByProduct, move.productId, move.id);
    for (const destination of destinations) {
      pushTo(insByDestination, destination, move.id);
    }
  }

  const currents = new Map<string, number>();
  const keyOf = (productId: string, locationId: string) => `${productId}|${locationId}`;
  const current = (productId: string, locationId: string) => currents.get(keyOf(productId, locationId)) ?? 0;
  const addTo = (productId: string, locationId: string, quantity: number) =>
    currents.set(keyOf(productId, locationId), current(productId, locationId) + quantity);
  // Stock on a shelf under Stock also counts as Stock.
  const addAt = (productId: string, locationId: string, quantity: number) => {
    if (stockSubLocationIds.has(locationId)) {
      addTo(productId, stockLocationId, quantity);
    }
    addTo(productId, locationId, quantity);
  };

  for (const quant of input.quants) {
    addAt(quant.productId, quant.locationId, quant.quantity);
  }

  const outsByProduct = new Map<string, ForecastMove[]>();

  for (const out of outs) {
    pushTo(outsByProduct, out.productId, out);
  }

  const outData = new Map<string, OutData>();
  const dataOf = (out: ForecastMove) => outData.get(out.id) ?? { reserved: 0, reservedMove: null, taken: 0 };

  for (const productOuts of outsByProduct.values()) {
    // Two deliveries fed by the same pick count its reservation once.
    const usedReserved = new Map<string, number>();

    for (const out of productOuts) {
      let reserved = 0;
      let reservedMove: ForecastMove | null = null;

      for (const linked of linkedMoves.get(out.id) ?? []) {
        if (!RESERVED_STATES.includes(linked.state)) {
          continue;
        }
        const used = usedReserved.get(linked.id) ?? 0;
        const part = Math.min(linked.quantity - used, out.productQty);

        if (part !== 0 && reservedMove === null) {
          reservedMove = linked;
        }
        reserved += part;
        usedReserved.set(linked.id, used + part);
        addAt(out.productId, linked.locationId, -part);
        if (compareAtDigits(reserved, out.productQty, digits) >= 0) {
          break;
        }
      }
      outData.set(out.id, { reserved, reservedMove, taken: 0 });
    }

    for (const out of productOuts) {
      const data = dataOf(out);
      let demandOut = out.productQty - data.reserved;

      for (const linked of linkedMoves.get(out.id) ?? []) {
        if (NOT_TAKING_STATES.includes(linked.state)) {
          continue;
        }
        const demand = Math.min(Math.max(linked.productQty - linked.quantity, 0), demandOut);

        if (isZero(demand)) {
          continue;
        }
        let available = current(out.productId, linked.locationId);

        // A chained move can only use what its origins brought in, less what
        // their other destinations already took.
        if (linked.moveOrigIds.length > 0) {
          const origins = movesOf(linked.moveOrigIds);
          const siblingIds = new Set(origins.flatMap((origin) => origin.moveDestIds).filter((id) => id !== linked.id));
          const movedIn = sum(origins.filter((origin) => origin.state === MOVE_STATE.DONE).map((origin) => origin.quantity));
          const movedOut = sum(
            movesOf([...siblingIds])
              .filter((sibling) => sibling.state === MOVE_STATE.DONE)
              .map((sibling) => sibling.quantity),
          );

          available = movedIn - movedOut - linked.quantity;
        }
        const taken = Math.min(demand, available, current(out.productId, linked.locationId));

        if (taken > 0) {
          addAt(out.productId, linked.locationId, -taken);
          data.taken += taken;
        }
        demandOut -= taken;
      }
    }
  }

  const productTotals = new Map<string, number>();

  for (const [key, quantity] of currents) {
    const [productId, locationId] = key.split('|');

    if (!stockSubLocationIds.has(locationId)) {
      productTotals.set(productId, (productTotals.get(productId) ?? 0) + quantity);
    }
  }

  const documentOf = (move: ForecastMove | null) =>
    move?.pickingId ? { id: move.pickingId, name: move.pickingName ?? '' } : null;
  const line = ({
    productId,
    quantity,
    moveIn = null,
    moveOut = null,
    reservedMove = null,
    inTransit = false,
    replenishmentFilled = true,
    removalDate = null,
  }: {
    productId: string;
    quantity: number;
    moveIn?: ForecastMove | null;
    moveOut?: ForecastMove | null;
    reservedMove?: ForecastMove | null;
    inTransit?: boolean;
    replenishmentFilled?: boolean;
    removalDate?: 'NOW' | string | null;
  }): ForecastLine => ({
    productId,
    quantity: floatRound(quantity, step),
    moveInId: moveIn?.id ?? null,
    moveOutId: moveOut?.id ?? null,
    documentIn: documentOf(moveIn),
    documentOut: documentOf(moveOut),
    receiptDate: moveIn?.date ?? null,
    deliveryDate: moveOut?.date ?? null,
    replenishmentFilled,
    isLate: moveIn !== null && moveOut !== null ? isBefore(moveOut.date, moveIn.date) : false,
    deliveryLate: moveOut !== null ? moveOut.state !== MOVE_STATE.DONE && isBefore(moveOut.date, input.now) : false,
    receiptLate: moveIn !== null ? moveIn.state !== MOVE_STATE.DONE && isBefore(moveIn.date, input.now) : false,
    inTransit,
    isMatched: [moveIn?.id, moveOut?.id].some((id) => id !== undefined && matched.has(id)),
    // A move outside any transfer still holds the stock, with no transfer to name.
    reservation: reservedMove === null ? null : { id: reservedMove.pickingId, name: reservedMove.pickingName ?? '' },
    removalDate,
  });

  const lines: ForecastLine[] = [];
  const reconcile = (out: ForecastMove, candidateInIds: string[], demand: number) => {
    let remaining = demand;
    const used: string[] = [];

    for (const inId of candidateInIds) {
      const moveIn = byId.get(inId);
      const available = inQuantity.get(inId) ?? 0;

      if (moveIn === undefined || isZero(available)) {
        used.push(inId);
        continue;
      }
      const taken = Math.min(remaining, available);

      remaining -= taken;
      lines.push(line({ productId: out.productId, quantity: taken, moveIn, moveOut: out }));
      inQuantity.set(inId, available - taken);
      if (available - taken <= 0) {
        used.push(inId);
      }
      if (isZero(remaining)) {
        break;
      }
    }

    for (const inId of used) {
      for (const destination of inDestinations.get(inId) ?? []) {
        insByDestination.set(
          destination,
          (insByDestination.get(destination) ?? []).filter((id) => id !== inId),
        );
      }
      const productId = byId.get(inId)?.productId ?? out.productId;

      insByProduct.set(
        productId,
        (insByProduct.get(productId) ?? []).filter((id) => id !== inId),
      );
    }

    return remaining;
  };

  const freeStockLines = (productId: string, freeStock: number) => {
    const expiry = input.expiry;

    if (expiry === undefined || !expiry.productIds.has(productId)) {
      return [line({ productId, quantity: freeStock })];
    }
    const expired = expiry.expiredQuants.filter((quant) => quant.productId === productId);
    const reservedExpired = sum(expired.map((quant) => quant.reservedQuantity));
    const unreservedExpired = sum(expired.map((quant) => quant.availableQuantity));
    const result: ForecastLine[] = [];

    if (!isZero(unreservedExpired)) {
      result.push(line({ productId, quantity: unreservedExpired, removalDate: 'NOW' }));
    }

    const freshByDay = new Map<string | null, number>();

    for (const quant of expiry.freshQuants) {
      if (quant.productId === productId) {
        freshByDay.set(quant.removalDay, (freshByDay.get(quant.removalDay) ?? 0) + quant.availableQuantity);
      }
    }
    // Stock the deliveries take leaves the earliest removal days first. The
    // amount is what every delivery in the report took, all products together.
    let toReduce = sum([...outData.values()].map((data) => data.taken));

    for (const [removalDay, availableQuantity] of [...freshByDay].sort(([left], [right]) =>
      compareNullableDay(left, right),
    )) {
      const reduce = Math.min(toReduce, availableQuantity);
      const left = availableQuantity - reduce;

      toReduce -= reduce;
      if (!isZero(left) && removalDay !== null) {
        result.push(line({ productId, quantity: left, removalDate: removalDay }));
      }
    }
    // Reserved stock past its removal date still sits in the free stock.
    result.push(line({ productId, quantity: freeStock + reservedExpired }));

    return result;
  };

  const productOrder = [...new Set([...ins, ...outs].map((move) => move.productId).concat(input.productIds))];

  for (const productId of productOrder) {
    const linesBefore = lines.length;
    const unreconciled: { demand: number; out: ForecastMove }[] = [];
    const freeStock = current(productId, stockLocationId);
    let transitStock = (productTotals.get(productId) ?? 0) - freeStock;

    for (const out of outsByProduct.get(productId) ?? []) {
      const data = dataOf(out);
      let demand = out.productQty;

      if (data.reserved > 0) {
        demand = Math.max(demand - data.reserved, 0);
        lines.push(
          line({
            productId,
            quantity: data.reserved,
            moveOut: out,
            reservedMove: data.reservedMove,
            inTransit: (data.reservedMove?.moveOrigIds.length ?? 0) > 0,
          }),
        );
      }
      if (isZero(demand)) {
        continue;
      }
      if (data.taken > 0) {
        demand = Math.max(demand - data.taken, 0);
        lines.push(line({ productId, quantity: data.taken, moveOut: out }));
      }
      if (isZero(demand)) {
        continue;
      }
      // Stock in the warehouse but outside Stock cannot be reserved yet.
      const unreservable = Math.min(demand, transitStock);

      if (unreservable > 0) {
        demand -= unreservable;
        transitStock -= unreservable;
        lines.push(line({ productId, quantity: unreservable, moveOut: out, inTransit: true }));
      }
      if (isZero(demand)) {
        continue;
      }
      demand = reconcile(out, insByDestination.get(out.id) ?? [], demand);
      if (!isZero(demand)) {
        unreconciled.push({ demand, out });
      }
    }

    for (const { demand, out } of unreconciled) {
      const remaining = reconcile(out, insByProduct.get(productId) ?? [], demand);

      if (!isZero(remaining)) {
        lines.push(line({ productId, quantity: remaining, moveOut: out, replenishmentFilled: false }));
      }
    }
    if (!isZero(transitStock)) {
      lines.push(line({ productId, quantity: transitStock, inTransit: true }));
    }
    if (!isZero(freeStock) || lines.length === linesBefore) {
      lines.push(...freeStockLines(productId, freeStock));
    }
    for (const inId of insByProduct.get(productId) ?? []) {
      const moveIn = byId.get(inId);
      const available = inQuantity.get(inId) ?? 0;

      if (moveIn !== undefined && !isZero(available)) {
        lines.push(line({ productId, quantity: available, moveIn }));
      }
    }
  }

  return lines;
};
