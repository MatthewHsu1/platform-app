import { defineView } from 'twenty-sdk/define';

import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { batchViewParts } from 'src/stock/views/batch-transfers.view';

export default defineView({
  universalIdentifier: VIEWS.waveTransfers,
  name: 'Wave Transfers',
  icon: 'IconWaveSine',
  position: 2,
  ...batchViewParts(VIEWS.waveTransfers, true),
});
