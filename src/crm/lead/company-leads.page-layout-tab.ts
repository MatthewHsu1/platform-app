import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';
import { frontComponentWidget } from 'src/shared/page-layout/widgets';

export default definePageLayoutTab({
  universalIdentifier: CRM_SCREEN_IDS.companyLeadsTab,
  pageLayoutUniversalIdentifier: STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.companyRecordPage.universalIdentifier,
  title: 'Leads',
  position: 15,
  icon: 'IconTarget',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [frontComponentWidget(CRM_SCREEN_IDS.companyLeadsWidget, 'Leads', CRM_SCREEN_IDS.companyLeads)],
});
