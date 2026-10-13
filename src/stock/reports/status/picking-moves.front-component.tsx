import { defineFrontComponent } from 'twenty-sdk/define';

import { makeStatusButton } from 'src/stock/reports/status/status-button';
import { STATUS_BUTTON_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.pickingMovesFrontComponent,
  name: 'platform-stock-picking-moves',
  description: 'Opens the detailed operations of the transfer.',
  isHeadless: true,
  component: makeStatusButton('pickingMoves'),
});
