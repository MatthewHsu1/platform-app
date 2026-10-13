import { destroyProcessedSuggestions } from 'src/stock/orderpoint/destroy-processed-suggestions';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { recomputeOrderpoint } from 'src/stock/orderpoint/recompute-orderpoint';
import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';
import { type OrderFinishPlan } from 'src/stock/orderpoint/types/order-finish-plan.type';

// Puts back the manual trigger an Automate click set for an order that wrote
// nothing. Written as the app: a resume runs with no user behind it.
export const revertAutomatic = async (orderpointIds: string[]) => {
  if (orderpointIds.length === 0) {
    return;
  }
  await stockWarehouseOrderpoints.updateMany(orderpointIds, { trigger: ORDERPOINT_TRIGGER.MANUAL });
  await recomputeOrderpoint(orderpointIds);
};

// Every step can run again: a resumed order repeats the ones a stopped run
// may already have done.
export const finishOrder = async (plan: OrderFinishPlan, revertIds: string[] = []) => {
  if (revertIds.length > 0) {
    await stockWarehouseOrderpoints.updateMany(revertIds, { trigger: ORDERPOINT_TRIGGER.MANUAL });
  }
  await stockWarehouseOrderpoints.updateMany(plan.clearTypedIds, { qtyToOrderManual: 0 });
  await recomputeOrderpoint(plan.orderpointIds);
  await destroyProcessedSuggestions(plan.orderpointIds);
};
