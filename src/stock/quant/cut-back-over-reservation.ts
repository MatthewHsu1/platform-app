import { floatRound } from 'src/shared/utils/float-round.util';
import { parseQuantKey } from 'src/stock/quant/quant-key';
import { graphqlQuantStore } from 'src/stock/quant/quant-store';
import { makeRecomputeReserved } from 'src/stock/quant/recompute-reserved';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { planOverReservationCutBack } from 'src/stock/utils/plan-over-reservation.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type QuantStore } from 'src/stock/quant/types/quant-store.type';

// Two runs that both saw the last unit free both reserved it. The newest
// lines give way, so the oldest reservation keeps the stock; the caller
// recomputes the moves whose lines changed.
export const makeCutBackOverReservation = (store: QuantStore) => {
  const recomputeReserved = makeRecomputeReserved(store);

  return async (keys: string[]) => {
    const changedMoveIds = new Set<string>();
    const digits = store.digits();

    for (const key of [...new Set(keys)]) {
      if ((await store.locationUsage(parseQuantKey(key).locationId)) !== LOCATION_USAGE.INTERNAL) {
        continue;
      }
      const quant = await store.findByKey(key);

      if (quant === null) {
        continue;
      }
      // The excess comes from the lines read now, not the stored reserved: a
      // stored value that still counts a line already gone would cut the
      // oldest reservation too.
      const lines = await store.openLines(key);
      const reservedQuantity = floatRound(
        lines.reduce((total, line) => total + line.quantityProductUom, 0),
        10 ** -digits,
        'HALF-UP',
      );

      if (compareAtDigits(reservedQuantity, quant.quantity, digits) <= 0) {
        continue;
      }
      const plan = planOverReservationCutBack({ quantity: quant.quantity, reservedQuantity, lines, digits });

      if (plan.destroy.length === 0 && plan.shrink.length === 0) {
        continue;
      }
      await store.destroyLines(plan.destroy);
      for (const line of plan.shrink) {
        await store.shrinkLine(line.id, line.quantity, line.quantityProductUom);
      }
      await recomputeReserved([key]);
      plan.changedMoveIds.forEach((moveId) => changedMoveIds.add(moveId));
    }

    return { changedMoveIds: [...changedMoveIds] };
  };
};

export const cutBackOverReservation = makeCutBackOverReservation(graphqlQuantStore);
