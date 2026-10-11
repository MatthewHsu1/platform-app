import { definePageLayoutTab } from 'twenty-sdk/define';

import { frontComponentWidget, recordPageTab } from 'src/stock/page-layouts/widgets';
import {
  PUSH_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_RULE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as LAYOUT_IDS,
} from 'src/stock/routing-universal-identifiers.constant';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: LAYOUT_IDS.tabPushFilter,
    objectUniversalIdentifier: STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Push filter',
    position: 11,
    icon: 'IconFilter',
    widgets: [frontComponentWidget(LAYOUT_IDS.widgetPushFilter, 'Push filter', PUSH_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER)],
  }),
);
