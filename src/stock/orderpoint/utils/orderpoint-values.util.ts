import { type DeadlineMove } from 'src/stock/orderpoint/types/deadline-move.type';
import { type OrderpointValues } from 'src/stock/orderpoint/types/orderpoint-values.type';
import { type OrderpointValuesInput } from 'src/stock/orderpoint/types/orderpoint-values-input.type';
import { dayOf } from 'src/stock/orderpoint/utils/day.util';
import { multipleRoundedQty } from 'src/stock/orderpoint/utils/multiple-rounded-qty.util';
import { addDays } from 'src/stock/utils/stock-dates.util';
import { compareAtDigits, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';

// A move not done yet counts where its chain ends, not at its next step.
const destinationOf = (move: DeadlineMove) => move.locationFinalId ?? move.locationDestId;

// Walk the open moves that enter or leave the warehouses (internal moves count
// neither way) at the rule's exact location, day by day from on hand, up to
// and including the horizon day. The first day the stock drops below min,
// less the lead days, is the deadline.
export const deadlineDate = ({
  today,
  horizonDays,
  leadDays,
  qtyOnHand,
  productMinQty,
  locationId,
  warehouseScopeIds,
  moves,
}: {
  today: string;
  horizonDays: number;
  leadDays: number;
  qtyOnHand: number;
  productMinQty: number;
  locationId: string;
  warehouseScopeIds: ReadonlySet<string>;
  moves: DeadlineMove[];
}): string | null => {
  if (qtyOnHand < productMinQty) {
    return today;
  }
  const horizonDay = addDays(today, horizonDays);
  const byDay = new Map<string, number>();

  for (const move of moves) {
    const day = dayOf(move.date);

    if (day > horizonDay) {
      continue;
    }
    const sourceInside = warehouseScopeIds.has(move.locationId);
    const destinationInside = warehouseScopeIds.has(destinationOf(move));

    if (!sourceInside && destinationInside && move.locationDestId === locationId) {
      byDay.set(day, (byDay.get(day) ?? 0) + move.productQty);
    } else if (sourceInside && !destinationInside && move.locationId === locationId) {
      byDay.set(day, (byDay.get(day) ?? 0) - move.productQty);
    }
  }
  let running = qtyOnHand;

  for (const day of [...byDay.keys()].sort()) {
    running += byDay.get(day) ?? 0;
    if (running < productMinQty) {
      const deadline = addDays(day, -leadDays);

      return deadline < horizonDay ? deadline : null;
    }
  }

  return null;
};

export const orderpointValues = (input: OrderpointValuesInput): OrderpointValues => {
  const { orderpoint, digits } = input;
  const qtyToOrderComputed =
    compareAtDigits(input.qtyForecast, orderpoint.productMinQty, digits) < 0
      ? multipleRoundedQty({
          qty: Math.max(orderpoint.productMinQty, orderpoint.productMaxQty) - input.qtyForecast,
          productUom: input.productUom,
          multiple: input.replenishmentUom,
          digits,
        })
      : 0;
  const qtyToOrder = orderpoint.qtyToOrderManual !== 0 ? orderpoint.qtyToOrderManual : qtyToOrderComputed;

  return {
    qtyOnHand: input.qtyOnHand,
    qtyForecast: input.qtyForecast,
    qtyToOrderComputed,
    qtyToOrder,
    leadDays: input.leadTimes.leadDays,
    leadHorizonDate: input.leadTimes.leadHorizonDate,
    deadlineDate: deadlineDate({
      today: input.today,
      horizonDays: input.horizonDays,
      leadDays: input.leadTimes.leadDays,
      qtyOnHand: input.qtyOnHand,
      productMinQty: orderpoint.productMinQty,
      locationId: orderpoint.locationId,
      warehouseScopeIds: input.warehouseScopeIds,
      moves: input.deadlineMoves,
    }),
    unwantedReplenish:
      !isZeroAtDigits(qtyToOrder, digits) &&
      compareAtDigits(orderpoint.productMaxQty, 0, digits) >= 0 &&
      compareAtDigits(input.qtyForecastNoEnd + qtyToOrder, orderpoint.productMaxQty, digits) > 0,
    showSupplyWarning: !input.hasRules,
    effectiveRouteId: orderpoint.routeId ?? input.defaultRouteId,
  };
};
