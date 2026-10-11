import { type DateOrder } from 'src/stock/utils/types/date-order.type';
import { type LotSequenceState } from 'src/stock/utils/types/lot-sequence-state.type';

export type PlanLotLinesInput = {
  mode: 'GENERATE' | 'IMPORT';
  productFound: boolean;
  tracking: 'SERIAL' | 'LOT';
  quantityReceived: number;
  firstLot: string;
  count: number;
  text: string;
  useExpirationDate: boolean;
  expirationTime: number;
  scheduledDate: string | null;
  today: Date;
  dateOrder: DateOrder;
  sequence: LotSequenceState | null;
};
