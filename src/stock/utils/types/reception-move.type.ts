import { type MoveState } from 'src/stock/types/move-state.type';
import { type Priority } from 'src/stock/types/priority.type';

// productQty is the demand and quantity the reserved or done quantity, both
// already in the product's unit.
export type ReceptionMove = {
  id: string;
  createdAt: string;
  productId: string;
  isStorable: boolean;
  state: MoveState;
  productQty: number;
  quantity: number;
  date: string;
  reservationDate: string | null;
  priority: Priority;
  locationId: string;
  pickingId: string | null;
  pickingName: string | null;
  pickingScheduledDate: string | null;
  moveOrigIds: string[];
  moveDestIds: string[];
};
