import { definePageLayoutTab } from 'twenty-sdk/define';

import { frontComponentWidget, recordPageTab } from 'src/stock/page-layouts/widgets';
import { TRACEABILITY_UNIVERSAL_IDENTIFIERS as IDS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.lotTab,
    objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Transfers and Traceability',
    position: 12,
    icon: 'IconRoute',
    widgets: [frontComponentWidget(IDS.lotTabWidget, 'Transfers and Traceability', IDS.widget)],
  }),
);
