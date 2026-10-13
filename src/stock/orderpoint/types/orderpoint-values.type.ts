export type OrderpointValues = {
  qtyOnHand: number;
  qtyForecast: number;
  qtyToOrderComputed: number;
  qtyToOrder: number;
  leadDays: number;
  leadHorizonDate: string;
  deadlineDate: string | null;
  unwantedReplenish: boolean;
  showSupplyWarning: boolean;
  effectiveRouteId: string | null;
};
