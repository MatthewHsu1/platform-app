import { describe, expect, it } from 'vitest';

import { planLotQuantDates } from 'src/product-expiry/utils/lot-quant-dates.util';
import { type LotQuant } from 'src/product-expiry/utils/types/lot-quant.type';

const now = '2025-03-10T09:00:00.000Z';

const quant = (fields: Partial<LotQuant> = {}): LotQuant => ({
  id: 'q',
  quantKey: 'apple|stock|lot||',
  lotId: 'lot',
  quantity: 10,
  reservedQuantity: 3,
  inDate: '2025-03-01T00:00:00.000Z',
  version: 4,
  inventoryQuantitySet: false,
  inventoryQuantity: null,
  inventoryDiffQuantity: null,
  expirationDate: '2025-03-20T09:00:00.000Z',
  removalDate: '2025-03-18T09:00:00.000Z',
  useExpirationDate: true,
  ...fields,
});

describe('planLotQuantDates', () => {
  it("copies both lot dates to its stock rows, and none of a row's stock is available once the removal date is reached", () => {
    expect(
      planLotQuantDates({
        lots: [{ id: 'lot', expirationDate: '2025-03-12T09:00:00.000Z', removalDate: '2025-03-09T09:00:00.000Z' }],
        quants: [quant()],
        now,
        digits: 2,
      }),
    ).toEqual([
      {
        id: 'q',
        version: 4,
        data: {
          expirationDate: '2025-03-12T09:00:00.000Z',
          removalDate: '2025-03-09T09:00:00.000Z',
          availableQuantity: 0,
          version: 5,
        },
      },
    ]);
  });

  it('makes the unreserved stock available again when the removal date moves into the future', () => {
    expect(
      planLotQuantDates({
        lots: [{ id: 'lot', expirationDate: '2025-03-30T09:00:00.000Z', removalDate: '2025-03-28T09:00:00.000Z' }],
        quants: [quant({ removalDate: '2025-03-09T09:00:00.000Z' })],
        now,
        digits: 2,
      }),
    ).toEqual([
      {
        id: 'q',
        version: 4,
        data: {
          expirationDate: '2025-03-30T09:00:00.000Z',
          removalDate: '2025-03-28T09:00:00.000Z',
          availableQuantity: 7,
          version: 5,
        },
      },
    ]);
  });

  it('writes nothing to a row that already shows the same instants', () => {
    expect(
      planLotQuantDates({
        lots: [{ id: 'lot', expirationDate: '2025-03-20T09:00:00Z', removalDate: '2025-03-18T09:00:00Z' }],
        quants: [quant()],
        now,
        digits: 2,
      }),
    ).toEqual([]);
  });
});
