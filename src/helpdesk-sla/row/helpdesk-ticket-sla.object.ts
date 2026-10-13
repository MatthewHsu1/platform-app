import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { SLA_STATE, SLA_STATE_OPTIONS } from 'src/helpdesk-sla/helpdesk-sla-options.constant';
import {
  HELPDESK_SLA_FIELD_UNIVERSAL_IDENTIFIERS as POLICY_IDS,
  HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_SLA_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { appTextField, appWritten, manyToOneField, numberField, selectField } from 'src/shared/fields';

// One promise on one case. Only the app writes these rows: the case trigger when a case is made, on a stage
// change, and the Refresh SLA button.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketSla',
  namePlural: 'helpdeskTicketSlas',
  labelSingular: 'Case SLA',
  labelPlural: 'Case SLAs',
  description: 'The promise of one SLA policy on one work case, with its deadline and state',
  icon: 'IconHourglass',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.ticket,
        name: 'ticket',
        label: 'Work case',
        icon: 'IconLifebuoy',
        onDelete: OnDeleteAction.CASCADE,
        targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.helpdeskTicketTicketSlas,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.sla,
        name: 'sla',
        label: 'SLA policy',
        icon: 'IconHourglass',
        onDelete: OnDeleteAction.RESTRICT,
        targetObjectUniversalIdentifier: HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: POLICY_IDS.ticketSlas,
      }),
    ),
    appTextField(FIELD_IDS.name, 'name', 'SLA', 'IconAbc'),
    appWritten({ universalIdentifier: FIELD_IDS.deadline, name: 'deadline', label: 'Deadline', icon: 'IconCalendarDue', type: FieldType.DATE_TIME }),
    appWritten(numberField(FIELD_IDS.hours, 'hours', 'Hours', 'IconClock', { decimals: 2, defaultValue: 0 })),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.expectedStage,
        name: 'expectedStage',
        label: 'Target stage',
        icon: 'IconProgress',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.stageExpectedSlaRows,
      }),
    ),
    appWritten(numberField(FIELD_IDS.consumedTime, 'consumedTime', 'Consumed time (hours)', 'IconClockHour4', { decimals: 2, defaultValue: 0 })),
    appWritten({
      universalIdentifier: FIELD_IDS.lastStateDate,
      name: 'lastStateDate',
      label: 'Last state change',
      icon: 'IconCalendarTime',
      type: FieldType.DATE_TIME,
    }),
    appWritten(selectField(FIELD_IDS.state, 'state', 'State', 'IconTrafficLights', SLA_STATE.ACCOMPLISHED, SLA_STATE_OPTIONS)),
  ],
});
