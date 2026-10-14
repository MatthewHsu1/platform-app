import { definePageLayoutTab } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_FIELDSERVICE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_FIELDSERVICE_PAGE_UNIVERSAL_IDENTIFIERS as PAGE_IDS,
} from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { recordPageTab, tableWidget } from 'src/shared/page-layout/widgets';

// A Service orders tab on Twenty's own work case page; its fields stay on the left.
export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: PAGE_IDS.caseServiceOrdersTab,
    objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Service orders',
    position: 12,
    icon: 'IconTruck',
    widgets: [tableWidget(PAGE_IDS.caseServiceOrdersWidget, 'Service orders', FIELD_IDS.helpdeskTicketFsmOrders, PAGE_IDS.caseServiceOrdersView)],
  }),
);
