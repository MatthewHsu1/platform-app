import { RECEPTION_MESSAGES } from 'src/stock/reports/reception/reception-messages.constant';
import { type AllocationRequest } from 'src/stock/reports/reception/types/allocation-request.type';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const isIdList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(isId);

const isQuantity = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

// The clicking user must be able to read every move asked for.
const checkReadable = async (request: AllocationRequest) => {
  const ids = [...new Set(request.flatMap((entry) => [entry.moveId, ...entry.inIds]))];

  if ((await filterReadableIds('stockMove', 'stockMoves', ids)).length !== ids.length) {
    throw new StockUserError(RECEPTION_MESSAGES.notFound);
  }
  return request;
};

// Allocate: one delivery move per entry of `moveIds`, with its quantity and its incoming moves.
export const readAllocateRequest = async (body: Record<string, unknown>) => {
  const { moveIds, quantities, inIds } = body;

  if (
    !isIdList(moveIds) ||
    !Array.isArray(quantities) ||
    !Array.isArray(inIds) ||
    quantities.length !== moveIds.length ||
    inIds.length !== moveIds.length ||
    // One entry per delivery move: two would split the same demand twice.
    new Set(moveIds).size !== moveIds.length ||
    !quantities.every(isQuantity) ||
    !inIds.every(isIdList)
  ) {
    throw new StockUserError(RECEPTION_MESSAGES.invalidRequest);
  }
  return checkReadable(moveIds.map((moveId, index) => ({ moveId, quantity: quantities[index], inIds: inIds[index] })));
};

// Unallocate: one delivery move, the quantity allocated to it, and the incoming moves to take off.
export const readUnallocateRequest = async (body: Record<string, unknown>) => {
  const { moveId, quantity, inIds } = body;

  if (!isId(moveId) || !isQuantity(quantity) || !isIdList(inIds)) {
    throw new StockUserError(RECEPTION_MESSAGES.invalidRequest);
  }
  const [entry] = await checkReadable([{ moveId, quantity, inIds }]);

  return entry;
};
