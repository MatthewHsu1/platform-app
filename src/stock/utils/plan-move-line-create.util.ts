import { MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { convertQuantity, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type CreatedLine } from 'src/stock/utils/types/created-line.type';
import { type LinePicking } from 'src/stock/utils/types/line-picking.type';
import { type LinkableMove } from 'src/stock/utils/types/linkable-move.type';
import { type MoveLineCreatePlan } from 'src/stock/utils/types/move-line-create-plan.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

// Moves that still need quantity come first; the sort keeps the transfer's order otherwise.
const linkableMoves = (moves: LinkableMove[], productId: string) =>
  moves
    .map((move, index) => ({ move, index }))
    .filter(({ move }) => move.productId === productId)
    .sort((left, right) => {
      const leftNeeds = (left.move.quantity ?? 0) < (left.move.productQty ?? 0) ? 0 : 1;
      const rightNeeds = (right.move.quantity ?? 0) < (right.move.productQty ?? 0) ? 0 : 1;

      return leftNeeds - rightNeeds || left.index - right.index;
    })
    .map(({ move }) => move);

export const planMoveLineCreate = ({
  line,
  move,
  picking,
  pickingMoves,
  product,
  uoms,
  locationUsages,
  digits,
  newMoveId,
}: {
  line: CreatedLine;
  move: LinkableMove | null;
  picking: LinePicking | null;
  pickingMoves: LinkableMove[];
  product: { productId: string; uomId: string; isStorable: boolean; displayName: string };
  uoms: Map<string, ResolvedUom>;
  locationUsages: Map<string, LocationUsage>;
  digits: number;
  newMoveId: string;
}): MoveLineCreatePlan => {
  let resolvedMove = move;
  let newMove: Record<string, unknown> | null = null;
  let picked = line.picked || (move?.picked ?? false);

  if (resolvedMove === null && picking !== null) {
    const candidates = picking.state === PICKING_STATE.DONE ? [] : linkableMoves(pickingMoves, line.productId);

    if (candidates.length > 0) {
      resolvedMove = candidates[0];
      picked = picked || resolvedMove.picked;
    } else {
      newMove = {
        id: newMoveId,
        productId: line.productId,
        productUomQty: picking.state === PICKING_STATE.DONE ? line.quantity : 0,
        productUomId: line.productUomId ?? product.uomId,
        locationId: picking.locationId,
        locationDestId: picking.locationDestId,
        picked: line.picked,
        pickingId: picking.id,
        state: picking.state,
        pickingTypeId: picking.pickingTypeId,
        restrictPartnerId: picking.ownerId,
        companyId: picking.companyId,
        personId: picking.personId,
      };
    }
  }

  const moveId = newMove === null ? (resolvedMove?.id ?? null) : newMoveId;
  const moveUomId = newMove === null ? (resolvedMove?.productUomId ?? null) : (newMove.productUomId as string);
  const moveLocationId = newMove === null ? (resolvedMove?.locationId ?? null) : picking?.locationId ?? null;
  const moveLocationDestId = newMove === null ? (resolvedMove?.locationDestId ?? null) : picking?.locationDestId ?? null;
  const state = newMove === null ? (resolvedMove?.state ?? MOVE_STATE.DRAFT) : (newMove.state as MoveState);
  const productUomId = line.productUomId ?? moveUomId ?? product.uomId;
  const locationId = line.locationId ?? moveLocationId ?? picking?.locationId ?? null;
  const locationDestId = line.locationDestId ?? moveLocationDestId ?? picking?.locationDestId ?? null;
  const quantityProductUom = convertQuantity({
    qty: line.quantity,
    fromUomId: productUomId,
    toUomId: product.uomId,
    uoms,
    digits,
    method: 'HALF-UP',
  });
  const reference = (newMove === null ? resolvedMove?.reference : null) ?? picking?.name ?? null;
  const name = reference === null ? product.displayName : `${reference}: ${product.displayName}`;

  const wanted: Record<string, unknown> = {
    moveId,
    pickingId: line.pickingId ?? resolvedMove?.pickingId ?? null,
    productUomId,
    locationId,
    locationDestId,
    quantityProductUom,
    picked,
    state,
    name,
  };
  const lineData = Object.fromEntries(
    Object.entries(wanted).filter(([field, value]) => (line as unknown as Record<string, unknown>)[field] !== value),
  );

  const reservationSourceId = moveId === null ? locationId : moveLocationId;
  const sourceUsage = reservationSourceId === null ? undefined : locationUsages.get(reservationSourceId);
  const bypass = sourceUsage === undefined || bypassesReservation(sourceUsage) || !product.isStorable;
  const hasQuantity = !isZeroAtDigits(quantityProductUom, digits);

  return {
    newMove,
    moveId,
    lineData,
    reservationNeeded: state !== MOVE_STATE.DONE && hasQuantity && !bypass,
    applyDone: state === MOVE_STATE.DONE && hasQuantity && product.isStorable,
  };
};
