import { defineLogicFunction } from 'twenty-sdk/define';

import {
  applyCounts,
  readConflictAnswer,
  readOptionalDateTime,
  readOptionalText,
  requireReadableQuantIds,
} from 'src/stock/quant/actions/count-actions';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  APPLY_INVENTORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  APPLY_INVENTORY_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: APPLY_INVENTORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-apply-inventory',
  description: 'Applies the counts of the selected stock rows as adjustment moves, asking first about outdated counts.',
  timeoutSeconds: 300,
  handler: stockRouteHandler(async (body) =>
    applyCounts({
      quantIds: await requireReadableQuantIds(body),
      onlySet: body.onlySet === true,
      inventoryName: readOptionalText(body.inventoryName),
      accountingDate: readOptionalDateTime(body.date),
      conflictAnswer: readConflictAnswer(body.conflictAnswer),
    }),
  ),
  httpRouteTriggerSettings: { path: APPLY_INVENTORY_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
