import { defineLogicFunction } from 'twenty-sdk/define';

import {
  PUT_IN_PACK_PACKAGES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  PUT_IN_PACK_PACKAGES_ROUTE_PATH,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { putPackagesInPack, readAnswer, readRunId } from 'src/stock/package/put-in-pack';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';

export default defineLogicFunction({
  universalIdentifier: PUT_IN_PACK_PACKAGES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-package-put-in-pack',
  description: 'Puts the selected packages into another package.',
  timeoutSeconds: 120,
  handler: stockRouteHandler((body) => putPackagesInPack(readIds(body, 'packageIds'), readAnswer(body), readRunId(body))),
  httpRouteTriggerSettings: { path: PUT_IN_PACK_PACKAGES_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
