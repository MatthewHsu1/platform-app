import { orderPickingCounts } from 'src/fieldservice-stock/utils/order-picking-counts.util';
import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { findMany } from 'src/shared/triggers/records';
import { writeGrouped } from 'src/shared/triggers/write-grouped';
import { stockPickings } from 'src/stock/stock-records';

// The only writer of an order's delivery and return counts: it counts the transfers that name the order by the
// code of their operation type and writes only the orders whose counts differ.
export const recomputeOrderPickingCounts = async (orderIds: (string | null)[]) => {
  const ids = [...new Set(orderIds.flatMap((id) => id ?? []))];

  if (ids.length === 0) {
    return;
  }
  const found = await findMany<{
    pickings: { fsmOrderId: string; pickingTypeCode: string | null }[];
    orders: { id: string; deliveryCount: number | null; returnCount: number | null }[];
  }>({
    pickings: { of: stockPickings, filter: { fsmOrderId: { in: ids } }, selection: 'fsmOrderId pickingTypeCode' },
    orders: { of: fsmOrders, filter: { id: { in: ids } }, selection: 'id deliveryCount returnCount' },
  });

  await writeGrouped(
    fsmOrders,
    found.orders.flatMap((order) => {
      const counts = orderPickingCounts(found.pickings.filter((picking) => picking.fsmOrderId === order.id).map((picking) => picking.pickingTypeCode));

      return counts.deliveryCount === (order.deliveryCount ?? 0) && counts.returnCount === (order.returnCount ?? 0) ? [] : [{ id: order.id, data: counts }];
    }),
  );
};
