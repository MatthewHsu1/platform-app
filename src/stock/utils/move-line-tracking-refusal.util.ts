import { PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { compareAtDigits, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type MoveLineTrackingInput } from 'src/stock/utils/types/move-line-tracking-input.type';
import { type TrackingRefusal } from 'src/stock/utils/types/tracking-refusal.type';

export const LOT_OF_OTHER_PRODUCT_MESSAGE = 'This lot {lot} is incompatible with this product {product}';
export const SERIAL_QUANTITY_MESSAGE = 'You can only process 1.0 {unit} of products with unique serial number.';

// A move line may name only a lot of its own product, and a serial line holds 0 or 1 unit in the product unit.
export const moveLineTrackingRefusal = ({
  tracking,
  quantityProductUom,
  productId,
  productName,
  lotProductId,
  lotName,
  unitName,
  digits,
}: MoveLineTrackingInput): TrackingRefusal | null => {
  if (lotProductId !== null && lotProductId !== productId) {
    return { message: LOT_OF_OTHER_PRODUCT_MESSAGE, values: { lot: lotName ?? '', product: productName } };
  }
  const allowed = isZeroAtDigits(quantityProductUom, digits) || compareAtDigits(quantityProductUom, 1, digits) === 0;

  return tracking === PRODUCT_TRACKING.SERIAL && !allowed ? { message: SERIAL_QUANTITY_MESSAGE, values: { unit: unitName } } : null;
};
