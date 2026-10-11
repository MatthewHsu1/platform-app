import { describe, expect, it } from 'vitest';

import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { planPickingTypeCodes } from 'src/stock/utils/plan-picking-type-codes.util';

const codeByTypeId = new Map<string, PickingTypeCode>([
  ['receipts', 'INCOMING'],
  ['deliveries', 'OUTGOING'],
]);

describe('planPickingTypeCodes', () => {
  it('copies the operation type code onto each transfer that differs', () => {
    expect(
      planPickingTypeCodes({
        pickings: [
          { id: 'new-receipt', pickingTypeId: 'receipts', pickingTypeCode: null },
          { id: 'retyped', pickingTypeId: 'deliveries', pickingTypeCode: 'INCOMING' },
        ],
        codeByTypeId,
      }),
    ).toEqual([
      { id: 'new-receipt', pickingTypeCode: 'INCOMING' },
      { id: 'retyped', pickingTypeCode: 'OUTGOING' },
    ]);
  });

  it('clears the code when the transfer has no type or the type is gone', () => {
    expect(
      planPickingTypeCodes({
        pickings: [
          { id: 'no-type', pickingTypeId: null, pickingTypeCode: 'OUTGOING' },
          { id: 'deleted-type', pickingTypeId: 'gone', pickingTypeCode: 'INTERNAL' },
        ],
        codeByTypeId,
      }),
    ).toEqual([
      { id: 'no-type', pickingTypeCode: null },
      { id: 'deleted-type', pickingTypeCode: null },
    ]);
  });

  it('writes nothing on a second pass', () => {
    expect(
      planPickingTypeCodes({
        pickings: [{ id: 'done', pickingTypeId: 'receipts', pickingTypeCode: 'INCOMING' }],
        codeByTypeId,
      }),
    ).toEqual([]);
  });
});
