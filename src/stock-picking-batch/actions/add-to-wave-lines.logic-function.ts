import { defineLogicFunction } from 'twenty-sdk/define';

import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import {
  STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { readRequestedPickingIds } from 'src/stock/picking/actions/read-requested-picking-ids';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { findAsPerson } from 'src/stock/stock-person-writes';
import { stockRouteHandler } from 'src/stock/stock-route';

type LineRow = {
  id: string;
  quantity: number | null;
  picking: { name: string | null } | null;
  product: { name: string | null } | null;
  productUom: { name: string | null } | null;
  location: { completeName: string | null; name: string | null } | null;
};

const locationName = (line: LineRow) => line.location?.completeName || line.location?.name || '';

// The open move lines of the chosen transfers, for the person to pick the
// ones that go into the wave; listed by location, as a picker walks them.
const handler = stockRouteHandler(async (body) => {
  const pickingIds = await readRequestedPickingIds(body);
  const pickings = await stockPickings.find<{ id: string; pickingTypeId: string | null }>({ id: { in: pickingIds } }, 'id pickingTypeId');

  if (new Set(pickings.flatMap((picking) => (picking.pickingTypeId === null ? [] : [picking.pickingTypeId]))).size > 1) {
    throw new StockUserError(BATCH_MESSAGES.sameType);
  }
  const lines = await findAsPerson<LineRow>(
    'stockMoveLines',
    'StockMoveLineFilterInput',
    { pickingId: { in: pickingIds }, not: { state: { in: [MOVE_STATE.DONE] } } },
    'id quantity picking { deletedAt name } product { deletedAt name } productUom { deletedAt name } location { deletedAt completeName name }',
  );

  return {
    lines: [...lines]
      .sort((left, right) => locationName(left).localeCompare(locationName(right)))
      .map((line) => ({
        id: line.id,
        label: [
          line.picking?.name || '',
          line.product?.name || '',
          `${line.quantity ?? 0} ${line.productUom?.name || ''}`.trim(),
          locationName(line),
        ].join(' · '),
      })),
  };
});

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.addToWaveLines,
  name: 'stock-picking-batch-add-to-wave-lines',
  description: 'Lists the open move lines of the chosen transfers, to pick the ones that go into a wave.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: STOCK_PICKING_BATCH_ROUTE_PATHS.addToWaveLines, httpMethod: 'POST', isAuthRequired: true },
});
