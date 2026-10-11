import { defineFrontComponent } from 'twenty-sdk/define';

import { makeStatusButton } from 'src/stock/reports/status/status-button';
import { STATUS_BUTTON_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.pickingPackagesFrontComponent,
  name: 'platform-stock-picking-packages',
  description: 'Opens the packages of the transfer.',
  isHeadless: true,
  component: makeStatusButton('pickingPackages'),
});
