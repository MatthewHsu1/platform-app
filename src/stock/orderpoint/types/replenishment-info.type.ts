import { type ResupplyOption } from 'src/stock/orderpoint/types/resupply-option.type';

// What the replenishment information pop-up shows for one reordering rule.
// Quantities are in the product's own unit; texts are already translated.
export type ReplenishmentInfo = {
  productName: string;
  warehouseName: string;
  uomName: string;
  productMinQty: number;
  productMaxQty: number;
  leadDays: {
    today: string;
    lines: { label: string; value: string }[];
    leadHorizonDate: string | null;
    trigger: string;
    qtyForecast: number;
    qtyToOrder: number;
    virtual: boolean;
  };
  graph: {
    productMinQty: number;
    productMaxQty: number;
    dailyDemand: number;
    averageStock: number;
    orderingPeriod: number;
    curve: number[];
    qtyOnHand: number;
    leadTime: number;
  };
  options: ResupplyOption[];
};
