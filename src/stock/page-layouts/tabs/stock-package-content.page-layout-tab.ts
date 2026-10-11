import { definePageLayoutTab } from 'twenty-sdk/define';

import { frontComponentWidget, recordPageTab } from 'src/stock/page-layouts/widgets';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS as FACTS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: FACTS.packageContentTab,
    objectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Content',
    position: 11,
    icon: 'IconPackage',
    widgets: [frontComponentWidget(FACTS.packageContentWidget, 'Content', FACTS.packageContent)],
  }),
);
