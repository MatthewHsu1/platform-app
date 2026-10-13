import { type LotExpiry } from 'src/product-expiry/utils/types/lot-expiry.type';
import { type MoveState } from 'src/stock/types/move-state.type';

// A move line with what its expiry dates are worked out from.
export type DatedMoveLine = LotExpiry & {
  id: string;
  state: MoveState;
  lotId: string | null;
  productId: string;
  pickingId: string | null;
  lot: LotExpiry | null;
  usesCreateLots: boolean;
  scheduledDate: string | null;
};
