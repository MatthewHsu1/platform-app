import { stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { pickingsLeavingBeforeBackorder } from 'src/stock-picking-batch/utils/plan-batch-validate.util';

// Called by the backorder writer before it makes a backorder for these transfers.
export const leaveBatchBeforeBackorder = async (
  pickingIds: string[],
  { validatingIds, pickingsToDetach }: { validatingIds: string[]; pickingsToDetach: string[] },
): Promise<void> => {
  const pickings = await stockPickings.find<{ id: string; state: string; batchId: string | null }>(
    { id: { in: pickingIds } },
    'id state batchId',
  );
  const batchIds = [...new Set(pickings.flatMap((picking) => (picking.batchId === null ? [] : [picking.batchId])))];
  const members = await stockPickings.find<{ id: string; batchId: string }>({ batchId: { in: batchIds } }, 'id batchId');
  const batchMembers = new Map<string, string[]>();

  for (const member of members) {
    batchMembers.set(member.batchId, [...(batchMembers.get(member.batchId) ?? []), member.id]);
  }
  await stockPickings.updateMany(pickingsLeavingBeforeBackorder({ pickings, validatingIds, pickingsToDetach, batchMembers }), {
    batchId: null,
  });
};
