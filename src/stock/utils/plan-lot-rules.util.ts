import { type LotNamePlan } from 'src/stock/utils/types/lot-name-plan.type';

export const LOT_NAME_MISSING_REASON =
  'A new lot/serial number was removed: it had no name and its product has no Serial/Lot Numbers Sequence to make one.';
export const LOT_PRODUCT_CHANGE_REFUSED =
  'You are not allowed to change the product linked to a serial or lot number if some stock moves have already been created with that number. This would lead to inconsistencies in your stock.';

export const planLotName = ({
  name,
  lotSequenceId,
}: {
  name: string | null;
  lotSequenceId: string | null;
}): LotNamePlan => {
  if (name !== null && name.length > 0) {
    return { kind: 'keep' };
  }
  return lotSequenceId === null
    ? { kind: 'refuse', reason: LOT_NAME_MISSING_REASON }
    : { kind: 'number', sequenceId: lotSequenceId };
};

export const lotProductChangeRefusal = ({
  beforeProductId,
  afterProductId,
  moveLineProductIds,
}: {
  beforeProductId: string | null;
  afterProductId: string | null;
  moveLineProductIds: string[];
}) =>
  beforeProductId !== afterProductId && moveLineProductIds.some((productId) => productId !== afterProductId)
    ? LOT_PRODUCT_CHANGE_REFUSED
    : null;
