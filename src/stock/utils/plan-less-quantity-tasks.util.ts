import { compareAtDigits } from 'src/stock/utils/stock-uom.util';

type LessQuantityOrigin = {
  pickingName: string;
  productName: string;
  uomName: string;
  demand: number;
  pickedQuantity: number;
  destinations: { pickingId: string; responsibleId: string | null; downstreamPickingNames: string[] }[];
};
type LessQuantityTask = {
  pickingId: string;
  assigneeId: string | null;
  originPickingName: string;
  exceptions: { productName: string; uomName: string; newQuantity: number; oldQuantity: number }[];
  impactedPickingNames: string[];
};

// One task per following transfer and product responsible. "Impacted" lists the transfers
// further down the chain, without the following transfers themselves.
export const planLessQuantityTasks = ({
  origins,
  digits,
}: {
  origins: LessQuantityOrigin[];
  digits: number;
}): LessQuantityTask[] => {
  const tasks = new Map<string, LessQuantityTask & { downstream: Set<string> }>();

  for (const origin of origins) {
    if (compareAtDigits(origin.demand, origin.pickedQuantity, digits) <= 0) {
      continue;
    }
    for (const destination of origin.destinations) {
      const groupKey = `${destination.pickingId}|${destination.responsibleId ?? ''}`;
      const task = tasks.get(groupKey) ?? {
        pickingId: destination.pickingId,
        assigneeId: destination.responsibleId,
        originPickingName: origin.pickingName,
        exceptions: [],
        impactedPickingNames: [],
        downstream: new Set<string>(),
      };

      task.exceptions.push({
        productName: origin.productName,
        uomName: origin.uomName,
        newQuantity: origin.pickedQuantity,
        oldQuantity: origin.demand,
      });
      destination.downstreamPickingNames.forEach((name) => task.downstream.add(name));
      tasks.set(groupKey, task);
    }
  }

  return [...tasks.values()].map(({ downstream, ...task }) => ({ ...task, impactedPickingNames: [...downstream] }));
};
