import { type DeadlineMove } from 'src/stock/orderpoint/types/deadline-move.type';
import { type OrderpointLeadTimes } from 'src/stock/orderpoint/types/orderpoint-lead-times.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export type OrderpointValuesInput = {
  today: string;
  horizonDays: number;
  digits: number;
  orderpoint: {
    trigger: 'AUTO' | 'MANUAL';
    productMinQty: number;
    productMaxQty: number;
    qtyToOrderManual: number;
    routeId: string | null;
    locationId: string;
  };
  leadTimes: OrderpointLeadTimes;
  hasRules: boolean;
  qtyOnHand: number;
  // Forecast at the location up to the end of leadHorizonDate, in-progress quantity included.
  qtyForecast: number;
  // Forecast at the location with no end date: what the stock becomes once everything planned is done.
  qtyForecastNoEnd: number;
  productUom: ResolvedUom;
  replenishmentUom: ResolvedUom | null;
  deadlineMoves: DeadlineMove[];
  warehouseScopeIds: ReadonlySet<string>;
  defaultRouteId: string | null;
};
