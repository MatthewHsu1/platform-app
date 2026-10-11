import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import { OVERVIEW_UNIVERSAL_IDENTIFIERS as IDS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default definePageLayout({
  universalIdentifier: IDS.pageLayout,
  name: 'Inventory overview',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: IDS.tab,
      title: 'Overview',
      position: 0,
      icon: 'IconLayoutDashboard',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: IDS.widget,
          title: 'Overview',
          type: 'FRONT_COMPONENT',
          heightBehavior: 'TAB_VIEWPORT',
          configuration: { configurationType: 'FRONT_COMPONENT', frontComponentUniversalIdentifier: IDS.frontComponent },
        },
      ],
    },
  ],
});
