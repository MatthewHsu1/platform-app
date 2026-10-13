import { type MoveState } from 'src/stock/types/move-state.type';
import { type Priority } from 'src/stock/types/priority.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';

export type RetryCandidate = {
  id: string;
  productId: string;
  state: MoveState;
  procureMethod: ProcureMethod;
  locationParentPath: string | null;
  reservationDate: string | null;
  reservesAtConfirm: boolean;
  priority: Priority;
  date: string | null;
  referenceIds: string[];
};
