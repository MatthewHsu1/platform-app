import { describe, expect, it } from 'vitest';

import { translate } from 'src/shared/i18n/translate';
import { moveLineTrackingRefusal } from 'src/stock/utils/move-line-tracking-refusal.util';
import { type MoveLineTrackingInput } from 'src/stock/utils/types/move-line-tracking-input.type';

const base: MoveLineTrackingInput = {
  tracking: 'SERIAL',
  quantityProductUom: 1,
  productId: 'p',
  productName: 'Bike',
  lotProductId: null,
  lotName: null,
  unitName: 'Units',
  digits: 2,
};

const text = (input: MoveLineTrackingInput) => {
  const refusal = moveLineTrackingRefusal(input);

  return refusal === null ? null : translate(null, refusal.message, refusal.values);
};

describe('moveLineTrackingRefusal', () => {
  it('allows 0 or 1 of a serial product', () => {
    expect(text(base)).toBeNull();
    expect(text({ ...base, quantityProductUom: 0 })).toBeNull();
  });

  it('refuses another quantity of a serial product', () => {
    expect(text({ ...base, quantityProductUom: 2 })).toBe('You can only process 1.0 Units of products with unique serial number.');
  });

  it('refuses a lot of another product', () => {
    expect(text({ ...base, tracking: 'LOT', quantityProductUom: 5, lotProductId: 'q', lotName: 'L1' })).toBe(
      'This lot L1 is incompatible with this product Bike',
    );
  });

  it('lets a lot of the same product through', () => {
    expect(text({ ...base, tracking: 'LOT', quantityProductUom: 5, lotProductId: 'p', lotName: 'L1' })).toBeNull();
  });
});
