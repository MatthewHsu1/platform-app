import { type DeliverySteps } from 'src/stock/types/delivery-steps.type';
import { type ReceptionSteps } from 'src/stock/types/reception-steps.type';

export type RoutingWarehouse = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  receptionSteps: ReceptionSteps;
  deliverySteps: DeliverySteps;
  receptionRouteId: string | null;
  deliveryRouteId: string | null;
  mtoPullId: string | null;
  lotStockId: string;
  whInputStockLocId: string;
  whQcStockLocId: string;
  whOutputStockLocId: string;
  whPackStockLocId: string;
  inTypeId: string;
  outTypeId: string;
  pickTypeId: string;
  packTypeId: string;
  qcTypeId: string;
  storeTypeId: string;
};
