import { defineFrontComponent } from 'twenty-sdk/define';

import { makeStatusButton } from 'src/stock/reports/status/status-button';
import { STATUS_BUTTON_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.pickingScrapsFrontComponent,
  name: 'platform-stock-picking-scraps',
  description: 'Opens the scrap orders of the transfer.',
  isHeadless: true,
  component: makeStatusButton('pickingScraps'),
});
