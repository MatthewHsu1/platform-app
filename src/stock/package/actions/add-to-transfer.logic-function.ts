import { defineLogicFunction } from 'twenty-sdk/define';

import {
  ADD_TO_TRANSFER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  ADD_TO_TRANSFER_ROUTE_PATH,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { addPackagesToTransfer } from 'src/stock/package/add-to-transfer';
import { readRunId } from 'src/stock/package/put-in-pack';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';

const PACKAGE_NOT_FOUND_MESSAGE = 'Package not found.';
const TRANSFER_NOT_FOUND_MESSAGE = 'Transfer not found.';

export default defineLogicFunction({
  universalIdentifier: ADD_TO_TRANSFER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-package-add-to-transfer',
  description: 'Adds the selected packages, whole, to an open transfer.',
  timeoutSeconds: 120,
  handler: stockRouteHandler(async (body) => {
    const asked = readIds(body, 'packageIds');
    const pickingId = typeof body.pickingId === 'string' && body.pickingId.length > 0 ? body.pickingId : null;
    const readable = await filterReadableIds('stockPackage', 'stockPackages', asked);

    if (asked.length === 0 || readable.length !== asked.length) {
      throw new StockUserError(PACKAGE_NOT_FOUND_MESSAGE);
    }
    if (pickingId === null) {
      throw new StockUserError(TRANSFER_NOT_FOUND_MESSAGE);
    }

    return { lineIds: await addPackagesToTransfer(asked, pickingId, readRunId(body)) };
  }),
  httpRouteTriggerSettings: { path: ADD_TO_TRANSFER_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
