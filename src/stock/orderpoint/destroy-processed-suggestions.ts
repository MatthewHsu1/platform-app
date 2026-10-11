import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { processedSuggestionIds } from 'src/stock/orderpoint/utils/processed-suggestions.util';
import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';

// Destroyed, not trashed: a trashed row keeps its product and location in the
// unique index, and the screen could not suggest that pair again.
export const destroyProcessedSuggestions = async (orderpointIds?: string[]) => {
  if (orderpointIds !== undefined && orderpointIds.length === 0) {
    return [];
  }
  const rows = await stockWarehouseOrderpoints.findIncludingDeleted<{
    id: string;
    autoCreated: boolean;
    trigger: 'AUTO' | 'MANUAL';
    qtyToOrder: number | null;
  }>(
    {
      autoCreated: { eq: true },
      trigger: { eq: ORDERPOINT_TRIGGER.MANUAL },
      ...(orderpointIds === undefined ? {} : { id: { in: orderpointIds } }),
    },
    'id autoCreated trigger qtyToOrder',
  );
  const ids = processedSuggestionIds(rows);

  return ids.length === 0 ? [] : stockWarehouseOrderpoints.destroyMany(ids);
};
