import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';

// Rows the replenishment screen made stay only while they have something to
// order; a row a person made is never cleaned up.
export const processedSuggestionIds = (
  rows: { id: string; autoCreated: boolean; trigger: 'AUTO' | 'MANUAL'; qtyToOrder: number | null }[],
) =>
  rows
    .filter((row) => row.autoCreated && row.trigger === ORDERPOINT_TRIGGER.MANUAL && (row.qtyToOrder ?? 0) <= 0)
    .map((row) => row.id);
