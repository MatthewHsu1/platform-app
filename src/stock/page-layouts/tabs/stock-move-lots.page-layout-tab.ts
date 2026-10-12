import { definePageLayoutTab } from 'twenty-sdk/define';

import { frontComponentWidget, recordPageTab } from 'src/shared/page-layout/widgets';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS as FACTS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: FACTS.moveLotsTab,
    objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Lots',
    position: 13,
    icon: 'IconBarcode',
    widgets: [frontComponentWidget(FACTS.moveLotsWidget, 'Lots', FACTS.moveLots)],
  }),
);
