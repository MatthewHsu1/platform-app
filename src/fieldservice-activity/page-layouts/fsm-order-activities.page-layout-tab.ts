import { definePageLayoutTab } from 'twenty-sdk/define';

import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import {
  FIELDSERVICE_ACTIVITY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  FIELDSERVICE_ACTIVITY_PAGE_UNIVERSAL_IDENTIFIERS as PAGE_IDS,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { recordPageTab, tableWidget } from 'src/shared/page-layout/widgets';

// An Activities tab on Twenty's own order page; its fields stay on the left.
export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: PAGE_IDS.orderTab,
    objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Activities',
    position: 11,
    icon: 'IconChecklist',
    widgets: [tableWidget(PAGE_IDS.orderWidget, 'Activities', INVERSE_IDS.fsmOrderOrderActivities, PAGE_IDS.orderView)],
  }),
);
