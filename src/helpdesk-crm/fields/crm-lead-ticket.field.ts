import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_CRM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS } from 'src/helpdesk-crm/helpdesk-crm-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineField({
  ...manyToOneField({
    universalIdentifier: INVERSE_IDS.crmLeadTicket,
    name: 'ticket',
    label: 'Work case',
    icon: 'IconLifebuoy',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: INVERSE_IDS.helpdeskTicketCrmLeads,
  }),
  objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
});
