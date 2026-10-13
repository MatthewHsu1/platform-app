import { defineFrontComponent } from 'twenty-sdk/define';

import { makeStatusButton } from 'src/stock/reports/status/status-button';
import { STATUS_BUTTON_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.variantLocationsFrontComponent,
  name: 'platform-stock-variant-locations',
  description: 'Opens the stock of the product in warehouse locations.',
  isHeadless: true,
  component: makeStatusButton('variantLocations'),
});
