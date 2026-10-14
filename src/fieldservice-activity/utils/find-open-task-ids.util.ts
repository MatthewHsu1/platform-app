import { type OrderTaskTarget } from 'src/fieldservice-activity/types/order-task-target.type';

// The tasks of an order that are not done and not in the trash. A task seen twice counts once, and a second pass over
// the same order finds none.
export const findOpenTaskIds = (targets: OrderTaskTarget[]): string[] => [
  ...new Set(targets.flatMap(({ task }) => (task === null || task.deletedAt !== null || task.status === 'DONE' ? [] : [task.id]))),
];
