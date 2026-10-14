import { defineView } from 'twenty-sdk/define';

import { FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS as ORDER_IDS, FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { FIELDSERVICE_CRM_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-crm/fieldservice-crm-universal-identifiers.constant';
import {
  HELPDESK_FIELDSERVICE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_FIELDSERVICE_PAGE_UNIVERSAL_IDENTIFIERS as PAGE_IDS,
} from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { allFields } from 'src/stock/views/list-columns';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

// The orders of the work case a page shows: number, location, closed status, worker and planned window. The stage
// is a staff list, which Twenty refuses as a column of a list the app makes, so the closed status stands in.
export default defineView(
  tableWidgetView({
    universalIdentifier: PAGE_IDS.caseServiceOrdersView,
    name: 'Work case service orders',
    objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      ORDER_IDS.name,
      ORDER_IDS.location,
      ORDER_IDS.closedStatus,
      ORDER_IDS.person,
      ORDER_IDS.scheduledDateStart,
      ORDER_IDS.scheduledDateEnd,
      ORDER_IDS.scheduledDuration,
    ],
    all: allFields(FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER, [
      ...Object.values(ORDER_IDS),
      FIELDSERVICE_CRM_FIELD_UNIVERSAL_IDENTIFIERS.fsmOrderOpportunity,
      FIELD_IDS.fsmOrderTicket,
    ]),
    parentField: FIELD_IDS.fsmOrderTicket,
  }),
);
