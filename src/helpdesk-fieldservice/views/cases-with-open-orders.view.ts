import { defineView, ViewType } from 'twenty-sdk/define';

import { FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS as ORDER_IDS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS as TICKET_IDS, HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_FIELDSERVICE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_FIELDSERVICE_PAGE_UNIVERSAL_IDENTIFIERS as PAGE_IDS,
} from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { allFields, listColumns } from 'src/stock/views/list-columns';
import { relatedIs } from 'src/stock/views/view-helpers';

const VIEW = PAGE_IDS.casesWithOpenOrdersView;

// The cases that have a service order still open: a filter on the closed status of the case's orders, which
// holds when at least one order matches. The service location is a column here. The channel list is made by the
// install, not by code, so it has no column of this view.
export default defineView({
  universalIdentifier: VIEW,
  name: 'With open service orders',
  objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconTruck',
  position: 20,
  fields: listColumns(
    VIEW,
    [TICKET_IDS.name, TICKET_IDS.number, TICKET_IDS.stage, TICKET_IDS.priority, TICKET_IDS.assignedUser, TICKET_IDS.person, FIELD_IDS.helpdeskTicketFsmLocation],
    allFields(HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER, [
      ...Object.values(TICKET_IDS).filter((id) => id !== TICKET_IDS.channel),
      FIELD_IDS.helpdeskTicketFsmLocation,
      FIELD_IDS.helpdeskTicketFsmOrders,
      FIELD_IDS.helpdeskTicketResolution,
    ]),
  ),
  filters: [relatedIs(VIEW, FIELD_IDS.helpdeskTicketFsmOrders, ORDER_IDS.closedStatus, ['OPEN'])],
});
