import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds } from 'src/stock/stock-route';

// The clicking user must be able to read every transfer they asked for.
export const readRequestedPickingIds = async (body: Record<string, unknown>) => {
  const requested = [...new Set(readIds(body, 'pickingIds'))];
  const readable = await filterReadableIds('stockPicking', 'stockPickings', requested);

  if (requested.length === 0 || readable.length !== requested.length) {
    throw new StockUserError('Transfer not found.');
  }

  return readable;
};
