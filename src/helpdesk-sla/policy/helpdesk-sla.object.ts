import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_SLA_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS as SLA_CATEGORY_IDS,
  HELPDESK_SLA_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_SLA_IGNORE_STAGE_FIELD_UNIVERSAL_IDENTIFIERS as SLA_IGNORE_STAGE_IDS,
  HELPDESK_SLA_IGNORE_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_TAG_FIELD_UNIVERSAL_IDENTIFIERS as SLA_TAG_IDS,
  HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as SLA_TEAM_IDS,
  HELPDESK_SLA_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_SLA_FIELD_UNIVERSAL_IDENTIFIERS as ROW_IDS,
  HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { activeField, manyToOneField, numberField, oneToManyField, textField } from 'src/shared/fields';

// A promise about response time: the stage a case should reach, in this many working days and hours, counted
// on its team's working hours. A policy applies to the cases its teams, categories, tags and filter allow;
// a stage listed under "Ignore stages" pauses the clock. The filter is edited on the policy page and saved
// as text.
export default defineObject({
  universalIdentifier: HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskSla',
  namePlural: 'helpdeskSlas',
  labelSingular: 'SLA policy',
  labelPlural: 'SLA policies',
  description: 'A promise to bring work cases to a stage within a number of working hours',
  icon: 'IconHourglass',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.stage,
      name: 'stage',
      label: 'Target stage',
      icon: 'IconProgress',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.stageSlaPolicies,
    }),
    numberField(FIELD_IDS.days, 'days', 'Days', 'IconCalendar', { decimals: 0, int: true, defaultValue: 0 }),
    numberField(FIELD_IDS.hours, 'hours', 'Hours', 'IconClock', { decimals: 0, int: true, defaultValue: 0 }),
    { universalIdentifier: FIELD_IDS.note, name: 'note', label: 'Note', icon: 'IconNotes', type: FieldType.RICH_TEXT },
    { ...textField(FIELD_IDS.domain, 'domain', 'Filter', 'IconFilter'), isUIEditable: false },
    activeField(FIELD_IDS.active),
    oneToManyField({
      universalIdentifier: FIELD_IDS.teams,
      name: 'teams',
      label: 'Teams',
      icon: 'IconUsersGroup',
      targetObjectUniversalIdentifier: HELPDESK_SLA_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: SLA_TEAM_IDS.sla,
      junctionTargetFieldUniversalIdentifier: SLA_TEAM_IDS.team,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.categories,
      name: 'categories',
      label: 'Categories',
      icon: 'IconCategory',
      targetObjectUniversalIdentifier: HELPDESK_SLA_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: SLA_CATEGORY_IDS.sla,
      junctionTargetFieldUniversalIdentifier: SLA_CATEGORY_IDS.category,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.tags,
      name: 'tags',
      label: 'Tags',
      icon: 'IconTag',
      targetObjectUniversalIdentifier: HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: SLA_TAG_IDS.sla,
      junctionTargetFieldUniversalIdentifier: SLA_TAG_IDS.tag,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.ignoreStages,
      name: 'ignoreStages',
      label: 'Ignore stages',
      icon: 'IconPlayerPause',
      targetObjectUniversalIdentifier: HELPDESK_SLA_IGNORE_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: SLA_IGNORE_STAGE_IDS.sla,
      junctionTargetFieldUniversalIdentifier: SLA_IGNORE_STAGE_IDS.stage,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.ticketSlas,
      name: 'ticketSlas',
      label: 'Case SLAs',
      icon: 'IconHourglass',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: ROW_IDS.sla,
    }),
  ],
});
