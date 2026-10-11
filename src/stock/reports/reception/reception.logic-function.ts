import { defineLogicFunction } from 'twenty-sdk/define';

import { readReceptionData } from 'src/stock/reports/reception/read-reception-data';
import { hasUpdateRights } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { RECEPTION_ROUTE_PATH, RECEPTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';
import { readStockSettings } from 'src/stock/stock-settings';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER, STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { showAllocation } from 'src/stock/utils/plan-allocation.util';
import { receptionReportLines } from 'src/stock/utils/reception-report-lines.util';

// The report lists what the transfers can feed whether or not allocating is
// offered; `canAllocate` decides whether the Allocate buttons show.
const handler = stockRouteHandler(async (body) => {
  const digits = readStockSettings().productUnitDigits;
  const data = await readReceptionData({
    pickingIds: readIds(body, 'pickingIds'),
    batchId: typeof body.batchId === 'string' && body.batchId.length > 0 ? body.batchId : null,
  });
  const result = receptionReportLines({ docs: data.docs, moves: data.moves, warehouseLocationIds: data.warehouseLocationIds, digits });

  if (result.kind === 'refused') {
    throw new StockUserError(result.reason);
  }
  const docIds = new Set(data.docs.map((doc) => doc.id));
  const isOfDocs = (move: { pickingId: string | null }) => move.pickingId !== null && docIds.has(move.pickingId);

  return {
    sources: result.sources,
    // Allocating changes moves: the buttons show only to someone whose role may do it.
    canAllocate:
      showAllocation({
        docs: data.docs,
        docMoves: data.moves.filter(isOfDocs),
        otherMoves: data.moves.filter((move) => !isOfDocs(move)),
        warehouseLocationIds: data.warehouseLocationIds,
      }) && (await hasUpdateRights([STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER, STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER])),
    products: data.products,
    urgentPickingIds: data.urgentPickingIds,
    digits,
  };
});

export default defineLogicFunction({
  universalIdentifier: RECEPTION_UNIVERSAL_IDENTIFIERS.reportLogicFunction,
  name: 'platform-stock-reception-report',
  description: 'Reception report: the waiting deliveries incoming quantities can be allocated to, and those already allocated.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: RECEPTION_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
