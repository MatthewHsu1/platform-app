import { defineField } from 'twenty-sdk/define';

import { FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { HELPDESK_FIELDSERVICE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { appWritten, numberField } from 'src/shared/fields';

// Written by the work case trigger: the active cases at the location.
export default defineField({
  ...appWritten(numberField(FIELD_IDS.fsmLocationTicketCount, 'ticketCount', 'Work cases count', 'IconListNumbers', { decimals: 0, int: true, defaultValue: 0 })),
  objectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
});
