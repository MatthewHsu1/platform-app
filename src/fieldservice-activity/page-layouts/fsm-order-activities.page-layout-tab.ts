import { definePageLayoutTab } from 'twenty-sdk/define';

import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { FIELDSERVICE_ACTIVITY_PAGE_UNIVERSAL_IDENTIFIERS as PAGE_IDS } from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { frontComponentWidget, recordPageTab } from 'src/shared/page-layout/widgets';

// An Activities tab on Twenty's own order page; its fields stay on the left. A table cannot carry a button on each
// row, so the tab holds a widget that lists the checklist with Complete and Cancel on every row.
export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: PAGE_IDS.orderTab,
    objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Activities',
    position: 11,
    icon: 'IconChecklist',
    widgets: [frontComponentWidget(PAGE_IDS.orderWidget, 'Activities', PAGE_IDS.orderFrontComponent)],
  }),
);
