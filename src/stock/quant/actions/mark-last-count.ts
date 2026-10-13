import { destinationKeyOf, sourceKeyOf } from 'src/stock/quant/quant-key';
import { stockQuants } from 'src/stock/stock-records';
import { todayUtc } from 'src/stock/stock-settings';
import { type InventoryMovePlan } from 'src/stock/utils/types/inventory-move-plan.type';

// The last count date of a row is the day an adjustment line last touched its key, at either end.
export const markLastCount = async (plans: InventoryMovePlan[]) => {
  const keys = [...new Set(plans.flatMap((plan) => [sourceKeyOf(plan), destinationKeyOf(plan)]))];

  if (keys.length === 0) {
    return;
  }
  const quants = await stockQuants.find<{ id: string }>({ quantKey: { in: keys } }, 'id');

  await stockQuants.updateMany(
    quants.map((quant) => quant.id),
    { lastCountDate: todayUtc() },
  );
};
