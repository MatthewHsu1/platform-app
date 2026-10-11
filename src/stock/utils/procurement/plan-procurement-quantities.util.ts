import { floatRound } from 'src/shared/utils/float-round.util';
import { isRoutingLocationUnder, routingLocationBypassesReservation } from 'src/stock/utils/procurement/location-chain.util';
import { type ConfirmingMove } from 'src/stock/utils/procurement/types/confirming-move.type';
import { type ProcurementContext } from 'src/stock/utils/procurement/types/procurement-context.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { computeQuantity } from 'src/uom/utils/uom.util';

// Free stock of a product at a location and every location under it.
export const freeQuantityAt = (productId: string, locationId: string, data: RoutingData, context: ProcurementContext) => {
  const location = data.locations.get(locationId);

  return context.quants
    .filter((quant) => quant.productId === productId && isRoutingLocationUnder(data.locations.get(quant.locationId), location))
    .reduce((sum, quant) => sum + quant.quantity - quant.reservedQuantity, 0);
};

// The quantity each move asks for. A take-from-stock-else-order move asks only
// for what the free stock at its source does not cover; stock already counted
// for an earlier move of the same run is not counted twice (`consumed`).
export const planProcurementQuantities = (
  moves: ConfirmingMove[],
  data: RoutingData,
  context: ProcurementContext,
  consumed: Map<string, number>,
) =>
  moves.map((move) => {
    const product = context.products.get(move.productId);
    const productUnit = product === undefined ? undefined : context.units.get(product.uomId);
    const moveUnit = context.units.get(move.productUomId);

    if (move.ruleProcureMethod !== 'MTS_ELSE_MTO' || product === undefined || productUnit === undefined || moveUnit === undefined) {
      return move.productUomQty;
    }

    const productQty = computeQuantity({ qty: move.productUomQty, from: moveUnit, to: productUnit, digits: context.digits, method: 'HALF-UP' });

    if (floatRound(productQty, 10 ** -context.digits) <= 0) {
      return move.productUomQty;
    }
    if (routingLocationBypassesReservation(data.locations.get(move.locationId)) || !product.isStorable) {
      return move.productUomQty;
    }

    const key = `${move.locationId}|${move.productId}`;
    const free = Math.max(freeQuantityAt(move.productId, move.locationId, data, context) - (consumed.get(key) ?? 0), 0);
    const missing = Math.max(productQty - free, 0);

    consumed.set(key, (consumed.get(key) ?? 0) + Math.min(productQty, free));

    return computeQuantity({ qty: missing, from: productUnit, to: moveUnit, digits: context.digits, method: 'HALF-UP' });
  });
