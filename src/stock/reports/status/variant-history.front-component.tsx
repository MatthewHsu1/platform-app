import { defineFrontComponent } from 'twenty-sdk/define';

import { makeStatusButton } from 'src/stock/reports/status/status-button';
import { STATUS_BUTTON_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.variantHistoryFrontComponent,
  name: 'platform-stock-variant-history',
  description: 'Opens the done move lines of the product.',
  isHeadless: true,
  component: makeStatusButton('variantHistory'),
});
