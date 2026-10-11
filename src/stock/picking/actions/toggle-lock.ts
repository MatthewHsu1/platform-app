import { StockUserError } from 'src/stock/stock-errors';
import { stockPickings } from 'src/stock/stock-records';

export const toggleLock = async (pickingIds: string[]) => {
  if (pickingIds.length !== 1) {
    throw new StockUserError('Lock or unlock one transfer at a time.');
  }
  const [picking] = await stockPickings.find<{ id: string; isLocked: boolean }>(
    { id: { eq: pickingIds[0] } },
    'id isLocked',
  );

  if (picking === undefined) {
    throw new StockUserError('Transfer not found.');
  }
  await stockPickings.update(picking.id, { isLocked: !picking.isLocked });

  return { isLocked: !picking.isLocked };
};
