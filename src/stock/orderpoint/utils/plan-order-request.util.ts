import { multipleRoundedQty } from 'src/stock/orderpoint/utils/multiple-rounded-qty.util';
import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type OrderMode } from 'src/stock/orderpoint/types/order-mode.type';
import { type OrderRequestPlan } from 'src/stock/orderpoint/types/order-request-plan.type';
import { type OrderRequestRow } from 'src/stock/orderpoint/types/order-request-row.type';

// Order To Max orders up to the maximum, rounded up to the multiple, in place
// of the stored quantity to order. Order and Order To Max are never refused:
// with nothing to order they order nothing and say so.
export const planOrderRequest = ({
  mode,
  rows,
  digits,
}: {
  mode: OrderMode;
  rows: OrderRequestRow[];
  digits: number;
}): OrderRequestPlan => {
  const hasQuantity = (row: OrderRequestRow) => compareAtDigits(row.qtyToOrder, 0, digits) > 0;

  if (mode === 'AUTOMATE') {
    return rows.every((row) => row.trigger !== ORDERPOINT_TRIGGER.AUTO && hasQuantity(row))
      ? { kind: 'order', quantities: new Map(), setAutoIds: rows.map((row) => row.id), nothingToOrder: false }
      : { kind: 'refuse', message: 'automateRefused' };
  }
  if (mode === 'ORDER_TO_MAX') {
    const quantities = new Map(
      rows.map((row) => [
        row.id,
        multipleRoundedQty({
          qty: row.productMaxQty - row.qtyForecast,
          productUom: row.productUom,
          multiple: row.replenishmentUom,
          digits,
        }),
      ]),
    );

    return {
      kind: 'order',
      quantities,
      setAutoIds: [],
      nothingToOrder: [...quantities.values()].every((quantity) => compareAtDigits(quantity, 0, digits) <= 0),
    };
  }

  return { kind: 'order', quantities: new Map(), setAutoIds: [], nothingToOrder: !rows.some(hasQuantity) };
};
