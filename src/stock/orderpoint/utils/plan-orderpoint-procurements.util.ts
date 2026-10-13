import { type OrderpointToProcure } from 'src/stock/orderpoint/types/orderpoint-to-procure.type';
import { addDays } from 'src/stock/utils/stock-dates.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

// The lead horizon date is today + total delay + horizon days: taking the
// horizon off at noon gives today + total delay.
export const orderpointProcurementDate = (leadHorizonDate: string, horizonDays: number) =>
  `${addDays(leadHorizonDate.slice(0, 10), -horizonDays)}T12:00:00.000Z`;

export const planOrderpointProcurements = ({
  orderpoints,
  horizonDays,
  digits,
  origins,
}: {
  orderpoints: OrderpointToProcure[];
  horizonDays: number;
  digits: number;
  origins: ReadonlyMap<string, { referenceIds: string[]; referenceNames: string[] }>;
}): { orderpointId: string; procurement: Procurement }[] =>
  orderpoints
    .filter((orderpoint) => compareAtDigits(orderpoint.qtyToOrder, 0, digits) > 0)
    .map((orderpoint) => {
      const references = origins.get(orderpoint.id);
      const date = orderpointProcurementDate(orderpoint.leadHorizonDate, horizonDays);

      return {
        orderpointId: orderpoint.id,
        procurement: {
          productId: orderpoint.productId,
          productQty: orderpoint.qtyToOrder,
          productUomId: orderpoint.productUomId,
          locationId: orderpoint.locationId,
          name: orderpoint.name,
          origin:
            references === undefined || references.referenceIds.length === 0
              ? orderpoint.name
              : `${orderpoint.name} - ${references.referenceNames.join(',')}`,
          values: {
            routeIds: orderpoint.routeId === null ? [] : [orderpoint.routeId],
            datePlanned: date,
            dateDeadline: date,
            warehouseId: orderpoint.warehouseId,
            orderpointId: orderpoint.id,
            referenceIds: references?.referenceIds ?? [],
          },
        },
      };
    });
