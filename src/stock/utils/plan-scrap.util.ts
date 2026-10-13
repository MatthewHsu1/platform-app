import { PRODUCT_TYPE } from 'src/product/product-options.constant';
import { MOVE_STATE, PROCURE_METHOD, SCRAP_STATE } from 'src/stock/stock-options.constant';
import { NEGATIVE_QUANTITY_MESSAGE } from 'src/stock/utils/plan-validate-checks.util';
import { compareAtDigits, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ScrapCheck } from 'src/stock/utils/types/scrap-check.type';
import { type ScrapMoveInput } from 'src/stock/utils/types/scrap-move-input.type';
import { type ScrapMovePlan } from 'src/stock/utils/types/scrap-move-plan.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type ScrapState } from 'src/stock/types/scrap-state.type';

export const SCRAP_POSITIVE_ONLY_MESSAGE = 'You can only enter positive quantities.';
// A negative scrap would fail when its line is validated, after the claim's commit point; it is refused first with
// the text that check gives.
export const SCRAP_NEGATIVE_MESSAGE = NEGATIVE_QUANTITY_MESSAGE;
export const SCRAP_NOT_DRAFT_MESSAGE = 'Only a draft scrap can be validated.';

// Every unit rounds at the "Product Unit" precision, so the scrap unit's zero is the zero at those digits.
export const planScrapQuantityRefusal = (scrapQty: number, digits: number): string | null => {
  if (isZeroAtDigits(scrapQty, digits)) {
    return SCRAP_POSITIVE_ONLY_MESSAGE;
  }

  return scrapQty < 0 ? SCRAP_NEGATIVE_MESSAGE : null;
};

export const planScrapName = (sequenceNumber: string | null) => sequenceNumber ?? 'New';

// Only the exact source key counts (no sub-locations), in the product unit; products that do not track inventory
// are never short.
export const planScrapCheck = ({
  state,
  scrapQty,
  scrapQtyProductUom,
  isStorable,
  onHandAtKey,
  digits,
}: {
  state: ScrapState;
  scrapQty: number;
  scrapQtyProductUom: number;
  isStorable: boolean;
  onHandAtKey: number;
  digits: number;
}): ScrapCheck => {
  if (state !== SCRAP_STATE.DRAFT) {
    return { kind: 'refuse', message: SCRAP_NOT_DRAFT_MESSAGE };
  }
  const refusal = planScrapQuantityRefusal(scrapQty, digits);

  if (refusal !== null) {
    return { kind: 'refuse', message: refusal };
  }
  if (isStorable && compareAtDigits(onHandAtKey, scrapQtyProductUom, digits) < 0) {
    return { kind: 'insufficient', quantityProductUom: scrapQtyProductUom };
  }

  return { kind: 'proceed' };
};

export const planScrapMove = ({
  scrap,
  scrapName,
  pickingName,
  moveId,
  lineId,
  now,
}: {
  scrap: ScrapMoveInput;
  scrapName: string;
  pickingName: string | null;
  moveId: string;
  lineId: string;
  now: string;
}): ScrapMovePlan => ({
  move: {
    id: moveId,
    origin: scrap.origin || pickingName || scrapName,
    productId: scrap.productId,
    productUomId: scrap.productUomId,
    state: MOVE_STATE.DRAFT,
    productUomQty: scrap.scrapQty,
    locationId: scrap.locationId,
    locationDestId: scrap.scrapLocationId,
    scrapId: scrap.scrapId,
    picked: true,
    pickingId: scrap.pickingId,
    procureMethod: PROCURE_METHOD.MAKE_TO_STOCK,
    date: now,
  },
  line: {
    id: lineId,
    moveId,
    productId: scrap.productId,
    productUomId: scrap.productUomId,
    quantity: scrap.scrapQty,
    quantityProductUom: scrap.scrapQtyProductUom,
    locationId: scrap.locationId,
    locationDestId: scrap.scrapLocationId,
    ...(scrap.lotId === null ? {} : { lotId: scrap.lotId }),
    ...(scrap.packageId === null ? {} : { packageId: scrap.packageId }),
    ownerId: scrap.ownerId,
    pickingId: scrap.pickingId,
    picked: true,
    state: MOVE_STATE.DRAFT,
    date: now,
  },
});

// Scrap from a transfer offers the goods its live or done moves carry.
export const planScrapProductChoices = ({
  moves,
  productTypes,
}: {
  moves: { productId: string; state: MoveState }[];
  productTypes: Map<string, string>;
}) => [
  ...new Set(
    moves
      .filter(
        (move) =>
          move.state !== MOVE_STATE.DRAFT &&
          move.state !== MOVE_STATE.CANCEL &&
          productTypes.get(move.productId) === PRODUCT_TYPE.CONSU,
      )
      .map((move) => move.productId),
  ),
];
