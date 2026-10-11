import { RestApiClient } from 'twenty-client-sdk/rest';

import { PRINT_VIEW_ROUTE_PATH } from 'src/stock/stock-printing-universal-identifiers.constant';

// Builds the link only: nothing is sent until the user opens it.
export const printViewUrl = (pass: string) =>
  new RestApiClient().resolveUrl(`/s${PRINT_VIEW_ROUTE_PATH}`, { query: { pass } });
