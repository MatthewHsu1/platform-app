import { describe, expect, it } from 'vitest';

import { processedSuggestionIds } from 'src/stock/orderpoint/utils/processed-suggestions.util';

describe('processedSuggestionIds', () => {
  it('lists the manual rows the replenishment screen made that have nothing left to order', () => {
    expect(
      processedSuggestionIds([
        { id: 'done', autoCreated: true, trigger: 'MANUAL', qtyToOrder: 0 },
        { id: 'negative', autoCreated: true, trigger: 'MANUAL', qtyToOrder: -2 },
        { id: 'open', autoCreated: true, trigger: 'MANUAL', qtyToOrder: 3 },
        { id: 'staff', autoCreated: false, trigger: 'MANUAL', qtyToOrder: 0 },
        { id: 'automated', autoCreated: true, trigger: 'AUTO', qtyToOrder: 0 },
      ]),
    ).toEqual(['done', 'negative']);
  });
});
