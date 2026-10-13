import { type DeliverySteps } from 'src/stock/types/delivery-steps.type';
import { type ReceptionSteps } from 'src/stock/types/reception-steps.type';

export type WarehouseEventRecord = {
  id: string;
  name: string | null;
  code: string | null;
  active: boolean;
  partnerId: string | null;
  receptionSteps: ReceptionSteps;
  deliverySteps: DeliverySteps;
  updatedBy?: { source?: string | null } | null;
};
