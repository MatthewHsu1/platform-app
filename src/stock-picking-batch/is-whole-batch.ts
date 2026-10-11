import { stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { isWholeBatchSelection } from 'src/stock-picking-batch/utils/whole-batch-selection.util';

// Whether these transfers are all the transfers of one batch, the detached ones aside.
export const isWholeBatch = async (pickingIds: string[], pickingsToDetach: string[]) => {
  const selected = await stockPickings.find<{ id: string; batchId: string | null }>({ id: { in: pickingIds } }, 'id batchId');
  const batchIds = [...new Set(selected.flatMap((picking) => (picking.batchId === null ? [] : [picking.batchId])))];

  if (batchIds.length !== 1) {
    return false;
  }
  const members = await stockPickings.find<{ id: string }>({ batchId: { eq: batchIds[0] } }, 'id');

  return isWholeBatchSelection({ selected, memberCount: () => members.length, detachCount: pickingsToDetach.length });
};
