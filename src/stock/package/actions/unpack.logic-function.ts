import { defineLogicFunction } from 'twenty-sdk/define';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import {
  UNPACK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  UNPACK_ROUTE_PATH,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { unpackPackages } from 'src/stock/package/unpack-package';
import { filterReadableIds } from 'src/stock/stock-access';
import { requireUpdateRights } from 'src/shared/object-rights';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';
import { PACKAGE_UNPACKED_REASON } from 'src/stock/utils/plan-package-rules.util';
import { STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const PACKAGE_NOT_FOUND_MESSAGE = 'Package not found.';

export default defineLogicFunction({
  universalIdentifier: UNPACK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-package-unpack',
  description: 'Frees the contained packages and moves the stock of each selected package out of it, in the same location.',
  timeoutSeconds: 300,
  handler: stockRouteHandler(async (body) => {
    const asked = readIds(body, 'packageIds');
    const readable = await filterReadableIds('stockPackage', 'stockPackages', asked);

    if (asked.length === 0 || readable.length !== asked.length) {
      throw new StockUserError(PACKAGE_NOT_FOUND_MESSAGE);
    }
    await requireUpdateRights([STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER]);

    // The adjustment moves are record data, so their name stays in English.
    const outcome = await unpackPackages(asked, PACKAGE_UNPACKED_REASON);

    if (outcome.kind === 'held') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    if (outcome.kind === 'refused') {
      throw new StockUserError(outcome.reason);
    }

    return { packageIds: asked };
  }),
  httpRouteTriggerSettings: { path: UNPACK_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
