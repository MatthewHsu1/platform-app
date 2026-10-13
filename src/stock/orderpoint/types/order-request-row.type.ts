import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export type OrderRequestRow = {
  id: string;
  trigger: 'AUTO' | 'MANUAL';
  qtyToOrder: number;
  qtyForecast: number;
  productMaxQty: number;
  productUom: ResolvedUom;
  replenishmentUom: ResolvedUom | null;
};
