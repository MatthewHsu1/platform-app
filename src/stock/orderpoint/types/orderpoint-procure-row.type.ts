import { type OrderpointToProcure } from 'src/stock/orderpoint/types/orderpoint-to-procure.type';

// A stored reordering rule with the product owner a failure task goes to.
export type OrderpointProcureRow = Omit<OrderpointToProcure, 'qtyToOrder' | 'leadHorizonDate'> & {
  qtyToOrder: number | null;
  leadHorizonDate: string | null;
  productTemplateId: string;
  productName: string;
  responsibleId: string | null;
};
