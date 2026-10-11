import { defineLogicFunction } from 'twenty-sdk/define';

import { assignPickings } from 'src/stock/picking/actions/assign-pickings';
import { readPickingIdsToChange } from 'src/stock/picking/actions/read-requested-picking-ids';
import { holdTransfers } from 'src/stock/reports/reception/allocation-holds';
import { StockUserError } from 'src/stock/stock-errors';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoves, stockPickings } from 'src/stock/stock-records';
import { stockRouteHandler } from 'src/stock/stock-route';
import { MOVE_ROW, PICKING_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import {
  CHECK_AVAILABILITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CHECK_AVAILABILITY_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';
import { showCheckAvailability } from 'src/stock/utils/check-availability.util';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';

const handler = stockRouteHandler(async (body) => {
  const pickingIds = await readPickingIdsToChange(body);
  const { productUnitDigits: digits } = readStockSettings();
  // Read and reserved while no allocation changes these transfers.
  return holdTransfers(pickingIds, async () => {
  const pickings = await stockPickings.find<PickingRow>({ id: { in: pickingIds } }, PICKING_ROW);
  const moves = await stockMoves.find<MoveRow>({ pickingId: { in: pickingIds } }, MOVE_ROW);
  const eligible = pickings.filter(
    (picking) =>
      picking.state === PICKING_STATE.DRAFT ||
      showCheckAvailability({
        state: picking.state,
        moves: moves
          .filter((move) => move.pickingId === picking.id)
          .map((move) => ({ picked: move.picked, productUomQty: move.productUomQty, quantity: move.quantity ?? 0, state: move.state })),
        digits,
      }),
  );

  if (eligible.length === 0) {
    throw new StockUserError('Nothing to check the availability for.');
  }

  await assignPickings(eligible.map((picking) => picking.id));

  return { pickingIds: eligible.map((picking) => picking.id) };
  });
});

export default defineLogicFunction({
  universalIdentifier: CHECK_AVAILABILITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-check-availability',
  description: 'Marks draft transfers as to do, then reserves stock for their waiting moves, urgent and earliest first.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: CHECK_AVAILABILITY_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
