import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { hasUpdateRights } from 'src/stock/stock-access';
import { stockPickings } from 'src/stock/stock-records';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// Printing the picking operations of a ready transfer marks it printed; other states keep the flag as it is.
// The flag is written with the app token, so a person who may not edit transfers still gets the print
// and the flag stays as it is.
export const markPrinted = async (pickingIds: string[]) => {
  if (!(await hasUpdateRights([STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER]))) {
    return;
  }
  const ready = await stockPickings.find<{ id: string }>(
    { id: { in: pickingIds }, state: { eq: PICKING_STATE.ASSIGNED }, printed: { eq: false } },
    'id',
  );

  await stockPickings.updateMany(
    ready.map((row) => row.id),
    { printed: true },
  );
};
