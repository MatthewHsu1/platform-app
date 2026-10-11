import { defineLogicFunction } from 'twenty-sdk/define';

import { readOptionalText, requireReadableQuantIds } from 'src/stock/quant/actions/count-actions';
import { relocateQuants } from 'src/stock/quant/actions/relocate-quants';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  RELOCATE_QUANTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  RELOCATE_QUANTS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: RELOCATE_QUANTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-relocate',
  description: 'Moves the whole of each selected stock row to another internal location.',
  timeoutSeconds: 300,
  handler: stockRouteHandler(async (body) =>
    relocateQuants(
      await requireReadableQuantIds(body),
      readOptionalText(body.destinationId),
      readOptionalText(body.reason),
    ),
  ),
  httpRouteTriggerSettings: { path: RELOCATE_QUANTS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
