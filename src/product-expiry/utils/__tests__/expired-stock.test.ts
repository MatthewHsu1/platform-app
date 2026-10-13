import { describe, expect, it } from 'vitest';

import { planExpiredQuantWrites } from 'src/product-expiry/utils/expired-stock.util';
import { type ExpiringQuant } from 'src/product-expiry/utils/types/expiring-quant.type';

const now = '2025-03-10T12:00:00.000Z';
const quant = (fields: Partial<ExpiringQuant>): ExpiringQuant => ({
  id: 'q1',
  quantKey: 'apple|stock',
  productId: 'apple',
  quantity: 12,
  reservedQuantity: 3,
  availableQuantity: 9,
  inDate: '2025-03-01T00:00:00.000Z',
  version: 4,
  inventoryQuantitySet: false,
  inventoryQuantity: null,
  inventoryDiffQuantity: null,
  removalDate: '2025-03-10T08:00:00.000Z',
  useExpirationDate: true,
  ...fields,
});

describe('planExpiredQuantWrites', () => {
  it('makes the available quantity of a row 0 once its removal date has come', () => {
    expect(planExpiredQuantWrites({ quants: [quant({})], now, digits: 2 })).toEqual([
      { id: 'q1', version: 4, data: { availableQuantity: 0, version: 5 } },
    ]);
  });

  it('writes nothing for a row already at 0 or a product without expiry dates', () => {
    expect(
      planExpiredQuantWrites({
        quants: [
          quant({ availableQuantity: 0 }),
          quant({ id: 'q2', useExpirationDate: false, quantity: 4, reservedQuantity: 0, availableQuantity: 4 }),
        ],
        now,
        digits: 2,
      }),
    ).toEqual([]);
  });
});
