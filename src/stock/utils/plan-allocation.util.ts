import { floatRound } from 'src/shared/utils/float-round.util';
import { MOVE_STATE, PICKING_STATE, PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { compareAtDigits, convertQuantity, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type AllocatePlan } from 'src/stock/utils/types/allocate-plan.type';
import { type AllocationIn } from 'src/stock/utils/types/allocation-in.type';
import { type AllocationLineWrite } from 'src/stock/utils/types/allocation-line-write.type';
import { type AllocationMoveLite } from 'src/stock/utils/types/allocation-move-lite.type';
import { type AllocationOut } from 'src/stock/utils/types/allocation-out.type';
import { type UnallocatePlan } from 'src/stock/utils/types/unallocate-plan.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

const OPEN_OUT_STATES: MoveState[] = [MOVE_STATE.CONFIRMED, MOVE_STATE.PARTIALLY_AVAILABLE, MOVE_STATE.WAITING];

// A move made from a line typed on a transfer has no demand, only a quantity.
const moveQuantityOf = (move: { productQty: number; quantity: number }) => move.productQty || move.quantity;

// Linking the two moves shares each side's references with the other side's transfer.
const referencesBetween = (incoming: AllocationIn, out: AllocationOut) => [
  ...(out.referenceIds.length > 0 && incoming.pickingId !== null
    ? [{ pickingId: incoming.pickingId, referenceIds: out.referenceIds }]
    : []),
  ...(incoming.referenceIds.length > 0 && out.pickingId !== null
    ? [{ pickingId: out.pickingId, referenceIds: incoming.referenceIds }]
    : []),
];

// The delivery lines a done receipt can serve first are the ones at the
// locations it put the goods in.
const linesKeptOnOut = (out: AllocationOut, quantity: number, ins: AllocationIn[], digits: number) => {
  const matching = new Set(ins.map((incoming) => incoming.locationDestId));
  const sorted = [...out.lines].sort(
    (left, right) => Number(!matching.has(left.locationId)) - Number(!matching.has(right.locationId)),
  );
  const kept = new Map<string, number>();
  let assigned = 0;

  for (const line of sorted) {
    const keep = assigned + line.quantityProductUom > quantity ? floatRound(quantity - assigned, 10 ** -digits) : line.quantityProductUom;

    kept.set(line.id, keep);
    assigned += keep;
    if (compareAtDigits(assigned, quantity, digits) === 0) {
      break;
    }
  }

  return out.lines.map((line) => {
    const outQuantity = kept.get(line.id) ?? 0;

    return {
      outId: out.id,
      lineId: line.id,
      outQuantity,
      remainderQuantity: floatRound(line.quantityProductUom - outQuantity, 10 ** -digits),
    };
  });
};

export const planAllocate = ({
  allocations,
  digits,
}: {
  allocations: { out: AllocationOut; quantity: number; ins: AllocationIn[] }[];
  digits: number;
}): AllocatePlan => {
  const plan: AllocatePlan = { splits: [], lineSplits: [], links: [], makeToOrder: [], references: [], assignMoveIds: [] };
  const destDemand = new Map<string, number>();

  for (const { out, quantity, ins } of allocations) {
    if (compareAtDigits(out.productQty, quantity, digits) === 1) {
      plan.splits.push({
        outId: out.id,
        remainderQty: floatRound(out.productQty - quantity, 10 ** -digits),
        reservationDate: out.reservationDate,
      });
      const isReceived = ins[0]?.state === MOVE_STATE.DONE;

      if (!isReceived && out.quantity !== 0) {
        // Nothing has arrived yet, so the allocated part cannot be reserved:
        // the remainder takes every reserved line.
        for (const line of out.lines) {
          plan.lineSplits.push({ outId: out.id, lineId: line.id, outQuantity: 0, remainderQuantity: line.quantityProductUom });
        }
      } else if (isReceived && out.quantity > quantity) {
        // The goods are in: the allocated part keeps as much of the
        // reservation as it needs, the remainder takes the rest.
        plan.lineSplits.push(...linesKeptOnOut(out, quantity, ins, digits));
      }
    }

    let toLink = quantity;
    let isLinked = false;

    for (const incoming of [...ins].reverse()) {
      const moveQuantity = moveQuantityOf(incoming);
      const fed = destDemand.get(incoming.id) ?? incoming.destDemand;

      // An incoming move already feeding moves for all of its quantity, by
      // another click for instance, is not counted again.
      if (incoming.productId !== out.productId || compareAtDigits(0, moveQuantity - fed, digits) >= 0) {
        continue;
      }
      plan.links.push({ inId: incoming.id, outId: out.id });
      plan.references.push(...referencesBetween(incoming, out));
      if (!incoming.isLinkedToOut) {
        destDemand.set(incoming.id, fed + Math.min(quantity, out.productQty));
      }
      isLinked = true;
      toLink -= Math.min(moveQuantity, toLink);
      if (isZeroAtDigits(toLink, digits)) {
        break;
      }
    }
    if (isLinked) {
      plan.makeToOrder.push(out.id);
    }
    plan.assignMoveIds.push(out.id);
  }

  return plan;
};

export const planUnallocate = ({
  out,
  quantity,
  ins,
  digits,
}: {
  out: AllocationOut;
  quantity: number;
  ins: AllocationIn[];
  digits: number;
}): UnallocatePlan => {
  const unlinks: UnallocatePlan['unlinks'] = [];
  const referencesToRemove: UnallocatePlan['referencesToRemove'] = [];
  let unallocated = 0;

  for (const incoming of ins) {
    if (!incoming.isLinkedToOut) {
      continue;
    }
    unlinks.push({ inId: incoming.id, outId: out.id });
    referencesToRemove.push(...referencesBetween(incoming, out));
    unallocated += Math.min(quantity, moveQuantityOf(incoming));
    if (compareAtDigits(quantity, unallocated, digits) <= 0) {
      break;
    }
  }
  const unlinkedIds = new Set(unlinks.map((unlink) => unlink.inId));
  const remainingOrigins = out.moveOrigs.filter((origin) => !unlinkedIds.has(origin.id));
  const newDemand = floatRound(
    remainingOrigins.reduce((total, origin) => total + origin.productQty, 0),
    10 ** -digits,
  );
  let split: UnallocatePlan['split'] = null;

  // The part other incoming moves still feed (a batch reserved together, or a
  // backorder of the receipt) stays linked on a move of its own.
  if (remainingOrigins.length > 0 && out.state !== MOVE_STATE.DONE && !isZeroAtDigits(newDemand, digits)) {
    const reserved = out.lines.reduce((total, line) => total + line.quantityProductUom, 0);
    const lineSplits = out.lines.map((line) => ({ lineId: line.id, outQuantity: 0, newQuantity: line.quantityProductUom }));
    // Reservation above the linked part's demand goes back to the unlinked
    // delivery move, which is then unreserved.
    let excess = reserved - newDemand;

    for (const lineSplit of lineSplits) {
      if (excess <= 0) {
        break;
      }
      if (lineSplit.newQuantity > excess) {
        lineSplit.outQuantity = floatRound(excess, 10 ** -digits);
        lineSplit.newQuantity = floatRound(lineSplit.newQuantity - excess, 10 ** -digits);
        break;
      }
      lineSplit.outQuantity = lineSplit.newQuantity;
      excess -= lineSplit.newQuantity;
      lineSplit.newQuantity = 0;
    }
    split = {
      newDemand,
      reservationDate: out.reservationDate,
      originIds: remainingOrigins.map((origin) => origin.id),
      lineSplits,
    };
  }

  return { unlinks, split, referencesToRemove, makeToStock: out.id, unreserve: out.id };
};

// The split line quantities in each line's own unit. One side is converted
// from the product unit (rounded half up); the other side is what is left of
// the line, so the two parts always add up to the line.
export const planAllocationLineWrites = ({
  splits,
  convertedSide,
  lines,
  uoms,
  digits,
  copyIdOf,
}: {
  splits: { lineId: string; outMoveId: string; outQuantity: number; otherMoveId: string; otherQuantity: number }[];
  convertedSide: 'out' | 'other';
  lines: Map<string, { quantity: number; productUomId: string; productUnitUomId: string }>;
  uoms: Map<string, ResolvedUom>;
  digits: number;
  copyIdOf: (lineId: string) => string;
}): AllocationLineWrite[] =>
  splits.flatMap((split): AllocationLineWrite[] => {
    if (split.outQuantity === 0) {
      return [{ kind: 'move', lineId: split.lineId, moveId: split.otherMoveId }];
    }
    const line = lines.get(split.lineId);

    if (split.otherQuantity === 0 || line === undefined) {
      return [];
    }
    const converted = convertQuantity({
      qty: convertedSide === 'out' ? split.outQuantity : split.otherQuantity,
      fromUomId: line.productUnitUomId,
      toUomId: line.productUomId,
      uoms,
      digits,
      method: 'HALF-UP',
    });
    const rest = floatRound(line.quantity - converted, 10 ** -digits);

    return [
      {
        kind: 'split',
        lineId: split.lineId,
        moveId: split.outMoveId,
        quantity: convertedSide === 'out' ? converted : rest,
        copyId: copyIdOf(split.lineId),
        copyMoveId: split.otherMoveId,
        copyQuantity: convertedSide === 'out' ? rest : converted,
      },
    ];
  });

// Whether the Allocation button shows: an incoming transfer whose storable
// products a waiting delivery of the same warehouse needs.
export const showAllocation = ({
  docs,
  docMoves,
  otherMoves,
  warehouseLocationIds,
}: {
  docs: { id: string; state: PickingState; pickingTypeCode: PickingTypeCode | null }[];
  docMoves: AllocationMoveLite[];
  otherMoves: AllocationMoveLite[];
  warehouseLocationIds: Set<string>;
}) => {
  if (docs.length === 0 || docs.some((doc) => doc.pickingTypeCode === PICKING_TYPE_CODE.OUTGOING)) {
    return false;
  }
  const lines = docMoves.filter((move) => move.isStorable && move.state !== MOVE_STATE.CANCEL);

  if (lines.length === 0) {
    return false;
  }
  // Only received goods can be allocated to a delivery that is already reserved.
  const states = docs[0].state === PICKING_STATE.DONE ? [...OPEN_OUT_STATES, MOVE_STATE.ASSIGNED] : OPEN_OUT_STATES;
  const docIds = new Set(docs.map((doc) => doc.id));
  const products = new Set(lines.map((move) => move.productId));
  const lineIds = new Set(lines.map((move) => move.id));

  return otherMoves.some(
    (move) =>
      states.includes(move.state) &&
      move.productQty > 0 &&
      warehouseLocationIds.has(move.locationId) &&
      !(move.pickingId !== null && docIds.has(move.pickingId)) &&
      products.has(move.productId) &&
      (move.moveOrigIds.length === 0 || move.moveOrigIds.some((id) => lineIds.has(id))),
  );
};
