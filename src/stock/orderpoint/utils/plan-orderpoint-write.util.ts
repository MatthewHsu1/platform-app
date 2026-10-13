import { type OrderpointValues } from 'src/stock/orderpoint/types/orderpoint-values.type';
import { type StoredOrderpointValues } from 'src/stock/orderpoint/types/stored-orderpoint-values.type';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';

const QUANTITY_KEYS = ['qtyOnHand', 'qtyForecast', 'qtyToOrderComputed', 'qtyToOrder', 'leadDays'] as const;
const OTHER_KEYS = ['leadHorizonDate', 'deadlineDate', 'unwantedReplenish', 'showSupplyWarning', 'effectiveRouteId'] as const;

// Only the values that differ, quantities compared at the unit precision.
export const planOrderpointWrite = (stored: StoredOrderpointValues, next: OrderpointValues, digits: number) => {
  const data: Record<string, unknown> = {};

  for (const key of QUANTITY_KEYS) {
    const before = stored[key];

    if (before === null || compareAtDigits(before, next[key], digits) !== 0) {
      data[key] = next[key];
    }
  }
  for (const key of OTHER_KEYS) {
    if (stored[key] !== next[key]) {
      data[key] = next[key];
    }
  }

  return data;
};
