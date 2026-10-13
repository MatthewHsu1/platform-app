import { type DeliverySteps } from 'src/stock/types/delivery-steps.type';
import { type ReceptionSteps } from 'src/stock/types/reception-steps.type';

export type WarehouseRow = {
  id: string;
  name: string | null;
  active: boolean;
  partnerId: string | null;
  code: string | null;
  receptionSteps: ReceptionSteps;
  deliverySteps: DeliverySteps;
  viewLocationId: string | null;
  lotStockId: string | null;
  whInputStockLocId: string | null;
  whQcStockLocId: string | null;
  whOutputStockLocId: string | null;
  whPackStockLocId: string | null;
  inTypeId: string | null;
  outTypeId: string | null;
  intTypeId: string | null;
  pickTypeId: string | null;
  packTypeId: string | null;
  qcTypeId: string | null;
  storeTypeId: string | null;
  xdockTypeId: string | null;
  sequence: number | null;
  seedKey: string | null;
  createdAt: string;
};
