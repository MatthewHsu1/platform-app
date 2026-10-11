import { filterReadableIds, requireUpdateRights } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds } from 'src/stock/stock-route';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The clicking user must be able to read every transfer they asked for.
export const readRequestedPickingIds = async (body: Record<string, unknown>) => {
  const requested = [...new Set(readIds(body, 'pickingIds'))];
  const readable = await filterReadableIds('stockPicking', 'stockPickings', requested);

  if (requested.length === 0 || readable.length !== requested.length) {
    throw new StockUserError('Transfer not found.');
  }

  return readable;
};

// The same, for a button that changes the transfers: the user's role must also allow editing them.
export const readPickingIdsToChange = async (body: Record<string, unknown>) => {
  const pickingIds = await readRequestedPickingIds(body);

  await requireUpdateRights([STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER]);

  return pickingIds;
};
