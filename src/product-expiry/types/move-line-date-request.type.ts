import { type MoveLineDateChange } from 'src/product-expiry/utils/types/move-line-date-change.type';

// `before` holds the line's lot, product and transfer before the first change seen: a change the stored line no
// longer shows (put back, or changed back) is dropped.
export type MoveLineDateRequest = {
  lineId: string;
  changed: MoveLineDateChange;
  before?: { lotId: string | null; productId: string; pickingId: string | null };
};
