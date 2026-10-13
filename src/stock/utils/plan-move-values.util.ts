import { MOVE_STATE, PICKING_TYPE_CODE, PRIORITY, RESERVATION_METHOD } from 'src/stock/stock-options.constant';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type MoveValuesInput } from 'src/stock/utils/types/move-values-input.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

type MoveValues = {
  quantity: number;
  picked: boolean;
  productQty: number;
  reservationDate: string | null;
  delayAlertDate: string | null;
  reference: string | null;
  name: string;
  descriptionPicking: string;
  packagingUomQty: number | null;
};

const RESERVABLE_STATES: MoveState[] = [
  MOVE_STATE.DRAFT,
  MOVE_STATE.CONFIRMED,
  MOVE_STATE.WAITING,
  MOVE_STATE.PARTIALLY_AVAILABLE,
];

// Record data stays in one language, so these inventory references are not translated.
const QUANTITY_CONFIRMED_REFERENCE = 'Product Quantity Confirmed';
export const QUANTITY_UPDATED_REFERENCE = 'Product Quantity Updated';

const subtractDays = (dateTime: string, days: number) => {
  const day = new Date(`${dateTime.slice(0, 10)}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
};

const planReservationDate = ({ move, pickingType }: MoveValuesInput) => {
  if (pickingType === null) {
    return move.reservationDate;
  }
  if (pickingType.reservationMethod === RESERVATION_METHOD.MANUAL) {
    return null;
  }
  if (
    pickingType.reservationMethod === RESERVATION_METHOD.BY_DATE &&
    RESERVABLE_STATES.includes(move.state) &&
    move.date !== null
  ) {
    const days =
      move.priority === PRIORITY.URGENT ? pickingType.reservationDaysBeforePriority : pickingType.reservationDaysBefore;
    return subtractDays(move.date, days ?? 0);
  }
  return move.reservationDate;
};

const planDelayAlertDate = ({ move, originMoves }: MoveValuesInput) => {
  if (move.state === MOVE_STATE.DONE || move.state === MOVE_STATE.CANCEL || move.date === null) {
    return null;
  }
  const openDates = originMoves
    .filter((origin) => origin.state !== MOVE_STATE.DONE && origin.state !== MOVE_STATE.CANCEL && origin.date !== null)
    .map((origin) => origin.date as string);
  const latestOrigin = openDates.reduce<string | null>(
    (best, date) => (best === null || Date.parse(date) > Date.parse(best) ? date : best),
    null,
  );

  return latestOrigin !== null && Date.parse(latestOrigin) > Date.parse(move.date) ? latestOrigin : null;
};

const planDescription = ({ move, product, pickingType }: MoveValuesInput) => {
  if (move.descriptionPickingManual !== null && move.descriptionPickingManual.length > 0) {
    return move.descriptionPickingManual;
  }
  const forOperation =
    pickingType === null
      ? null
      : {
          [PICKING_TYPE_CODE.INCOMING]: product.descriptionPickingin,
          [PICKING_TYPE_CODE.OUTGOING]: product.descriptionPickingout,
          [PICKING_TYPE_CODE.INTERNAL]: product.descriptionPicking,
        }[pickingType.code];

  if (forOperation !== null && forOperation.length > 0) {
    return forOperation;
  }
  if (pickingType?.code === PICKING_TYPE_CODE.OUTGOING) {
    return product.displayName;
  }
  return product.templateDescription ?? product.displayName;
};

export const planMoveValues = (input: MoveValuesInput): MoveValues => {
  const { move, lines, product, picking, uoms, digits } = input;
  const moveUomId = move.productUomId ?? product.uomId;
  const quantity = lines.reduce(
    (sum, line) =>
      sum +
      convertQuantity({ qty: line.quantity, fromUomId: line.productUomId ?? moveUomId, toUomId: moveUomId, uoms, digits, round: false }),
    0,
  );
  const picked =
    move.state === MOVE_STATE.DONE || lines.some((line) => line.picked)
      ? true
      : lines.length > 0
        ? false
        : move.picked;
  const reference =
    input.scrapName ??
    (move.isInventory
      ? (move.inventoryName ?? (quantity === 0 ? QUANTITY_CONFIRMED_REFERENCE : QUANTITY_UPDATED_REFERENCE))
      : (picking?.name ?? null));
  const prefix = `${picking?.origin ? `${picking.origin}/` : ''}${product.defaultCode ? `${product.defaultCode}: ` : ''}`;

  return {
    quantity,
    picked,
    productQty: convertQuantity({
      qty: move.productUomQty,
      fromUomId: moveUomId,
      toUomId: product.uomId,
      uoms,
      digits,
      method: 'HALF-UP',
    }),
    reservationDate: planReservationDate(input),
    delayAlertDate: planDelayAlertDate(input),
    reference,
    name: `${prefix}${input.sourceName ?? ''} > ${input.destinationName ?? ''}`,
    descriptionPicking: planDescription(input),
    packagingUomQty:
      move.packagingUomId === null
        ? null
        : convertQuantity({
            qty: move.productUomQty,
            fromUomId: moveUomId,
            toUomId: move.packagingUomId,
            uoms,
            digits,
            method: 'UP',
          }),
  };
};

export const planLineValues = ({
  quantity,
  lineUomId,
  productUomId,
  reference,
  productName,
  uoms,
  digits,
}: {
  quantity: number;
  lineUomId: string | null;
  productUomId: string;
  reference: string | null;
  productName: string;
  uoms: Map<string, ResolvedUom>;
  digits: number;
}) => ({
  quantityProductUom: convertQuantity({
    qty: quantity,
    fromUomId: lineUomId ?? productUomId,
    toUomId: productUomId,
    uoms,
    digits,
    method: 'HALF-UP',
  }),
  name: reference === null ? productName : `${reference}: ${productName}`,
});
