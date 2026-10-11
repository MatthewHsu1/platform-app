import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { sourceKeyOf } from 'src/stock/quant/quant-key';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type OpenLineEditPlan } from 'src/stock/utils/types/open-line-edit-plan.type';
import { type OpenLineValues } from 'src/stock/utils/types/open-line-values.type';
import { type MoveState } from 'src/stock/types/move-state.type';

export const PRODUCT_CHANGE_REASON = "Changing the product is only allowed in 'Draft' state.";
export const NEGATIVE_RESERVATION_REASON = 'Reserving a negative quantity is not allowed.';

const NOT_STAMPED_STATES: MoveState[] = [MOVE_STATE.DRAFT, MOVE_STATE.CANCEL, MOVE_STATE.DONE];

// `quantityProductUom` of both sides is the line quantity in the product unit (half up), worked out by the caller.
export const planOpenLineEdit = ({
  before,
  after,
  storedQuantityProductUom,
  isStorable,
  digits,
  now,
}: {
  before: OpenLineValues;
  after: OpenLineValues;
  storedQuantityProductUom: number | null;
  isStorable: boolean;
  digits: number;
  now: string;
}): OpenLineEditPlan => {
  if (before.state === MOVE_STATE.DONE || after.state === MOVE_STATE.DONE) {
    return { kind: 'none' };
  }
  if (after.productId !== before.productId && after.state !== MOVE_STATE.DRAFT) {
    return { kind: 'putBack', data: { productId: before.productId }, reason: PRODUCT_CHANGE_REASON };
  }

  const quantityChanged = before.quantity !== after.quantity || before.productUomId !== after.productUomId;
  const keyChanged = sourceKeyOf(before) !== sourceKeyOf(after);

  if (quantityChanged && isStorable && compareAtDigits(after.quantityProductUom, 0, digits) < 0) {
    return {
      kind: 'putBack',
      data: { quantity: before.quantity, productUomId: before.productUomId },
      reason: NEGATIVE_RESERVATION_REASON,
    };
  }

  const data: Record<string, unknown> = {};

  if (storedQuantityProductUom !== after.quantityProductUom) {
    data.quantityProductUom = after.quantityProductUom;
  }
  if (!NOT_STAMPED_STATES.includes(after.state)) {
    const pickedNow = after.picked && !before.picked;
    const moreWhilePicked =
      quantityChanged && before.picked && compareAtDigits(before.quantityProductUom, after.quantityProductUom, digits) < 0;

    if (pickedNow || moreWhilePicked) {
      data.date = now;
    }
  }

  const recomputeKeys =
    isStorable && (keyChanged || quantityChanged) ? [...new Set([sourceKeyOf(before), sourceKeyOf(after)])] : [];
  const recomputeMoveIds = [
    ...new Set(
      [
        ...(quantityChanged || before.picked !== after.picked ? [after.moveId] : []),
        ...(before.moveId !== after.moveId ? [before.moveId, after.moveId] : []),
      ].filter((id): id is string => id !== null),
    ),
  ];

  if (Object.keys(data).length === 0 && recomputeKeys.length === 0 && recomputeMoveIds.length === 0) {
    return { kind: 'none' };
  }

  return { kind: 'sync', data, recomputeKeys, recomputeMoveIds };
};
