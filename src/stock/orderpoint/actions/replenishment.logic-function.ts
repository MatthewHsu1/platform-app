import { defineLogicFunction } from 'twenty-sdk/define';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { twentyMetadata } from 'src/shared/twenty-graphql';
import { requireOrderpointUpdateRight } from 'src/stock/orderpoint/actions/orderpoint-action-route';
import { refreshReplenishmentSuggestions } from 'src/stock/orderpoint/refresh-replenishment-suggestions';
import { StockUserError } from 'src/stock/stock-errors';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  ORDERPOINT_ROUTE_PATHS,
  ORDERPOINT_VIEW_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-universal-identifiers.constant';

const TIMEOUT_SECONDS = 300;

// View ids differ per workspace; the app's own view is found by its universal
// id with the app's token ('application').
const readReplenishmentViewId = async () => {
  const views = await twentyMetadata<{ getViews: { id: string; universalIdentifier: string | null }[] }>(
    'application',
    'query { getViews { id universalIdentifier } }',
  );

  return views.data?.getViews.find((view) => view.universalIdentifier === ORDERPOINT_VIEW_UNIVERSAL_IDENTIFIERS.replenishment)?.id ?? null;
};

// Refreshes the suggestions, then answers the view to open. `filling` says a
// background run is still adding rows; while one runs, the list opens as it is.
const handler = stockRouteHandler(async () => {
  await requireOrderpointUpdateRight();

  const result = await refreshReplenishmentSuggestions({
    deadlineAt: Date.now() + (TIMEOUT_SECONDS - 60) * 1000,
    locale: await readUserLocale(),
  });

  if (result.kind === 'held' && !result.continuing) {
    throw new StockUserError(CLAIM_HELD_MESSAGE);
  }
  if (result.kind === 'refused') {
    throw new StockUserError(result.error.message, result.error.values);
  }
  return { viewId: await readReplenishmentViewId(), filling: result.kind === 'continued' || result.kind === 'held' };
});

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.replenishment,
  name: 'stock-orderpoint-replenishment',
  description: 'Refreshes the replenishment suggestions, then returns the Replenishment view to open.',
  timeoutSeconds: TIMEOUT_SECONDS,
  handler,
  httpRouteTriggerSettings: { path: ORDERPOINT_ROUTE_PATHS.replenishment, httpMethod: 'POST', isAuthRequired: true },
});
