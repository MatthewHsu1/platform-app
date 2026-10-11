import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockPickings } from 'src/stock/stock-records';

// Printing the picking operations of a ready transfer marks it printed; other states keep the flag as it is.
export const markPrinted = async (pickingIds: string[]) => {
  const ready = await stockPickings.find<{ id: string }>(
    { id: { in: pickingIds }, state: { eq: PICKING_STATE.ASSIGNED }, printed: { eq: false } },
    'id',
  );

  await stockPickings.updateMany(
    ready.map((row) => row.id),
    { printed: true },
  );
};
