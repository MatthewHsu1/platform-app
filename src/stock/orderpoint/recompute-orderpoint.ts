import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { readOrderpointInputs } from 'src/stock/orderpoint/read-orderpoint-input';
import { type OrderpointFailure } from 'src/stock/orderpoint/types/orderpoint-failure.type';
import { orderpointValues } from 'src/stock/orderpoint/utils/orderpoint-values.util';
import { planOrderpointWrite } from 'src/stock/orderpoint/utils/plan-orderpoint-write.util';
import { readStockSettings } from 'src/stock/stock-settings';

const CHUNK = 50;

// The one writer of the computed values of reordering rules; it writes only
// what changed. A loop in the supply rules leaves the values as they are and
// comes back as a failure: a button shows it, a trigger or the daily job makes
// a task on the product.
export const recomputeOrderpoint = async (orderpointIds: string[]) => {
  const failures: OrderpointFailure[] = [];
  const digits = readStockSettings().productUnitDigits;
  const ids = [...new Set(orderpointIds)];

  for (let start = 0; start < ids.length; start += CHUNK) {
    for (const context of await readOrderpointInputs(ids.slice(start, start + CHUNK))) {
      if (context.kind === 'loop') {
        failures.push({ orderpointId: context.row.id, ...context.owner, error: context.error });
        continue;
      }
      await stockWarehouseOrderpoints.update(context.row.id, planOrderpointWrite(context.row, orderpointValues(context.input), digits));
    }
  }

  return { failures };
};
