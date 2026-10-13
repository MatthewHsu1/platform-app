import { describe, expect, it } from 'vitest';

import { emptyQuantFilter, planZeroQuantCleanup } from 'src/stock/utils/plan-zero-quant-cleanup.util';
import { type CleanupQuant } from 'src/stock/utils/types/cleanup-quant.type';

const quant = (overrides: Partial<CleanupQuant> & { id: string }): CleanupQuant => ({
  quantity: 0,
  reservedQuantity: 0,
  inventoryQuantity: null,
  assignedUserId: null,
  ...overrides,
});

describe('planZeroQuantCleanup', () => {
  it('removes rows with nothing on hand, nothing reserved, no count and no assigned user', () => {
    expect(
      planZeroQuantCleanup({
        productUnitDigits: 2,
        quants: [
          quant({ id: 'empty' }),
          quant({ id: 'dust', quantity: 0.0000001 }),
          quant({ id: 'counted-zero', inventoryQuantity: 0 }),
          quant({ id: 'micro', quantity: 0.000001 }),
          quant({ id: 'reserved', reservedQuantity: 1 }),
          quant({ id: 'counted', inventoryQuantity: 3 }),
          quant({ id: 'assigned', assignedUserId: 'member-1' }),
          quant({ id: 'negative', quantity: -2 }),
        ],
      }),
    ).toEqual(['empty', 'dust', 'counted-zero']);
  });

  it('rounds at twice the unit digits when that is more than 6', () => {
    expect(
      planZeroQuantCleanup({ productUnitDigits: 4, quants: [quant({ id: 'tiny', quantity: 0.0000001 })] }),
    ).toEqual([]);
  });
});

// The filter form of the rule, read as SQL (round(x, 6) = 0, NULL allowed for quantity and the count).
describe('emptyQuantFilter', () => {
  it('keeps a value only strictly inside half a step at max(6, 2 × unit digits) decimals', () => {
    expect(emptyQuantFilter(2)).toEqual({
      and: [
        { or: [{ quantity: { is: 'NULL' } }, { and: [{ quantity: { gt: -5e-7 } }, { quantity: { lt: 5e-7 } }] }] },
        { and: [{ reservedQuantity: { gt: -5e-7 } }, { reservedQuantity: { lt: 5e-7 } }] },
        {
          or: [
            { inventoryQuantity: { is: 'NULL' } },
            { and: [{ inventoryQuantity: { gt: -5e-7 } }, { inventoryQuantity: { lt: 5e-7 } }] },
          ],
        },
        { assignedUserId: { is: 'NULL' } },
      ],
    });
  });
});
