import { findOpenTaskIds } from 'src/fieldservice-activity/utils/find-open-task-ids.util';
import { type OrderTaskTarget } from 'src/fieldservice-activity/types/order-task-target.type';
import { taskTargets, tasks } from 'src/stock/stock-tasks';

// Completing an order closes the tasks scheduled on it, as the app: a task may belong to someone else. Safe to run
// twice: a second pass finds none open.
export const markOrderTasksDone = async (orderId: string) => {
  const targets = await taskTargets.find<OrderTaskTarget>({ targetFsmOrderId: { eq: orderId } }, 'id task { id status deletedAt }');
  const openIds = findOpenTaskIds(targets);

  if (openIds.length > 0) {
    await tasks.updateMany(openIds, { status: 'DONE' });
  }
};
