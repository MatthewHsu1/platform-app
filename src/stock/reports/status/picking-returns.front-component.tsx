import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStatusButton } from 'src/stock/reports/status/status-button';
import { STATUS_BUTTON_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

// Texts the shared status button and the route show, listed here so the extractor puts them in the catalog.
export const STATUS_BUTTON_CATALOG_TEXTS = [
  msg('Nothing to show.'),
  msg('{count} records: see the tables on this page.'),
  msg('Could not open the list.'),
  msg('Choose one record.'),
  msg('Record not found.'),
];

// The text of the shared selection check (src/shared/front-components/selection-check.ts), which the extractor does not
// reach: Choose one record. is listed above.
export const SELECTION_CATALOG_TEXTS = [msg('Tick at least one record.')];

export default defineFrontComponent({
  universalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.pickingReturnsFrontComponent,
  name: 'platform-stock-picking-returns',
  description: 'Opens the returns of the transfer.',
  isHeadless: true,
  component: makeStatusButton('pickingReturns'),
});
