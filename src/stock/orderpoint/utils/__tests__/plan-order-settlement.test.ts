import { describe, expect, it } from 'vitest';

import { planOrderSettlement } from 'src/stock/orderpoint/utils/plan-order-settlement.util';

const plan = { orderpointIds: ['op1', 'op2', 'op3'], clearTypedIds: ['op1', 'op2'], automaticIds: ['op1', 'op2', 'op3'] };

describe('planOrderSettlement', () => {
  it('finishes the rules of every chunk that reached its writes, and hands the others back unordered', () => {
    expect(
      planOrderSettlement({ plan, chunks: [{ orderpointIds: ['op1'], procurementRunId: 'p1' }], pendingProcurementRunId: null }),
    ).toEqual({
      writtenIds: ['op1'],
      finish: { orderpointIds: ['op1', 'op2', 'op3'], clearTypedIds: ['op1'], automaticIds: ['op1', 'op2', 'op3'] },
      revertIds: ['op2', 'op3'],
    });
  });

  it('a chunk whose procurement claim is still there and not committed wrote nothing', () => {
    expect(
      planOrderSettlement({
        plan,
        chunks: [
          { orderpointIds: ['op1'], procurementRunId: 'p1' },
          { orderpointIds: ['op2', 'op3'], procurementRunId: 'p2' },
        ],
        pendingProcurementRunId: 'p2',
      }),
    ).toMatchObject({ writtenIds: ['op1'], revertIds: ['op2', 'op3'] });
  });

  it('a pending procurement claim of a chunk not yet marked leaves the marked chunks written', () => {
    expect(
      planOrderSettlement({ plan, chunks: [{ orderpointIds: ['op1'], procurementRunId: 'p1' }], pendingProcurementRunId: 'p2' }),
    ).toMatchObject({ writtenIds: ['op1'], revertIds: ['op2', 'op3'] });
  });

  it('with no chunk written there is nothing to finish: every rule made automatic goes back', () => {
    expect(planOrderSettlement({ plan, chunks: [], pendingProcurementRunId: 'p1' })).toEqual({
      writtenIds: [],
      finish: null,
      revertIds: ['op1', 'op2', 'op3'],
    });
  });
});
