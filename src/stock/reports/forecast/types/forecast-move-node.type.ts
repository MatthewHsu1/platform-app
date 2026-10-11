import { type MoveState } from 'src/stock/types/move-state.type';
import { type Priority } from 'src/stock/types/priority.type';

// A move as the report reads it; quantity is in the move's own unit.
export type ForecastMoveNode = {
  id: string;
  createdAt: string;
  productId: string;
  state: MoveState;
  productQty: number | null;
  quantity: number | null;
  productUomId: string | null;
  date: string;
  reservationDate: string | null;
  priority: Priority;
  locationId: string | null;
  locationDestId: string | null;
  locationFinalId: string | null;
  pickingId: string | null;
  picking: { name: string | null } | null;
};
