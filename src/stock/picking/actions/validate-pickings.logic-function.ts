import { defineLogicFunction } from 'twenty-sdk/define';

import { afterValidateBatch } from 'src/stock-picking-batch/after-validate-batch';
import { expiredLotsToConfirm } from 'src/stock/lot/validate-tracking-checks';
import { readPickingIdsToChange } from 'src/stock/picking/actions/read-requested-picking-ids';
import { validatePickings } from 'src/stock/picking/actions/validate-pickings';
import { makeValidateRoute } from 'src/stock/picking/actions/validate-route';
import { autoprint, receptionReportToShow } from 'src/stock/printing/autoprint';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  VALIDATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  VALIDATE_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(
  makeValidateRoute({
    readPickingIds: readPickingIdsToChange,
    validatePickings,
    expiredLotsToConfirm,
    afterValidateBatch,
    autoprint,
    receptionReportToShow,
  }),
);

export default defineLogicFunction({
  universalIdentifier: VALIDATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'validate-pickings',
  description: 'Validates transfers: moves the stock of their picked lines, makes backorders, and asks first when Validate would.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: {
    path: VALIDATE_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
