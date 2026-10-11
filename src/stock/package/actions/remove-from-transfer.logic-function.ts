import { defineLogicFunction } from 'twenty-sdk/define';

import {
  REMOVE_FROM_TRANSFER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  REMOVE_FROM_TRANSFER_ROUTE_PATH,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { removePackagesFromTransfers } from 'src/stock/package/remove-from-transfer';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';

const PACKAGE_NOT_FOUND_MESSAGE = 'Package not found.';

export default defineLogicFunction({
  universalIdentifier: REMOVE_FROM_TRANSFER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-package-remove-from-transfer',
  description: 'Takes the selected packages out of their open transfers.',
  timeoutSeconds: 120,
  handler: stockRouteHandler(async (body) => {
    const asked = readIds(body, 'packageIds');
    const readable = await filterReadableIds('stockPackage', 'stockPackages', asked);

    if (asked.length === 0 || readable.length !== asked.length) {
      throw new StockUserError(PACKAGE_NOT_FOUND_MESSAGE);
    }
    const plan = await removePackagesFromTransfers(asked);

    return { packageIds: asked, removedLineIds: plan.deleteLineIds };
  }),
  httpRouteTriggerSettings: { path: REMOVE_FROM_TRANSFER_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
