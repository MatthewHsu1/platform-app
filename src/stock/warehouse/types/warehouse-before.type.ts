import { type DeliverySteps } from 'src/stock/types/delivery-steps.type';
import { type ReceptionSteps } from 'src/stock/types/reception-steps.type';

export type WarehouseBefore = {
  name: string | null;
  code: string | null;
  receptionSteps: ReceptionSteps;
  deliverySteps: DeliverySteps;
  active?: boolean;
};
