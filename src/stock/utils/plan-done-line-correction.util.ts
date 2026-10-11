import { destinationKeyOf, sourceKeyOf } from 'src/stock/quant/quant-key';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type CorrectionSide } from 'src/stock/utils/types/correction-side.type';
import { type DoneLineCorrectionPlan } from 'src/stock/utils/types/done-line-correction-plan.type';

// The line as it was is undone (out of its destination, back into its source, which gets the in-date that removal
// passed on), then the line as it is now is done again, each with its whole quantity: a lot one of these steps takes
// below zero is made up from the stock without a lot by that step's quantity. An edit that changes no key and no
// quantity posts nothing.
export const planDoneLineCorrection = ({
  before,
  after,
  storable,
  digits,
}: {
  before: CorrectionSide;
  after: CorrectionSide;
  storable: boolean;
  digits: number;
}): DoneLineCorrectionPlan => {
  if (!storable) {
    return { deltas: [], freeKey: null };
  }
  const beforeSource = sourceKeyOf(before);
  const beforeDestination = destinationKeyOf(before);
  const afterSource = sourceKeyOf(after);
  const afterDestination = destinationKeyOf(after);
  const steps = [
    { key: beforeDestination, delta: -before.quantityProductUom, inDateFromKey: null },
    { key: beforeSource, delta: before.quantityProductUom, inDateFromKey: beforeDestination },
    { key: afterSource, delta: -after.quantityProductUom, inDateFromKey: null },
    { key: afterDestination, delta: after.quantityProductUom, inDateFromKey: null },
  ];
  const sums = new Map<string, number>();

  steps.forEach((step) => sums.set(step.key, (sums.get(step.key) ?? 0) + step.delta));

  if ([...sums.values()].every((sum) => isZeroAtDigits(sum, digits))) {
    return { deltas: [], freeKey: null };
  }

  return { deltas: steps.filter((step) => !isZeroAtDigits(step.delta, digits)), freeKey: afterSource };
};
