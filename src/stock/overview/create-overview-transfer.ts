import { OVERVIEW_MESSAGES } from 'src/stock/overview/overview-messages.constant';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { createAsPerson } from 'src/stock/stock-person-writes';

// A draft transfer of the card's operation type, made by the user: the
// transfer rules fill its reference, locations and policy from the type.
export const createOverviewTransfer = async (body: Record<string, unknown>) => {
  const { pickingTypeId } = body;

  if (typeof pickingTypeId !== 'string' || pickingTypeId.length === 0) {
    throw new StockUserError(OVERVIEW_MESSAGES.invalidRequest);
  }
  const [readableTypeId] = await filterReadableIds('stockPickingType', 'stockPickingTypes', [pickingTypeId]);

  if (readableTypeId === undefined) {
    throw new StockUserError(OVERVIEW_MESSAGES.notFound);
  }
  const [pickingId] = await createAsPerson('stockPickings', 'StockPickingCreateInput', [{ pickingTypeId: readableTypeId }]);

  return { pickingId };
};
