import { defineObject, FieldType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { activeField, appWritten, booleanField, manyToOneField, numberField, oneToManyField, seedKeyField, textField } from 'src/shared/fields';
import {
  CRM_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  CRM_TEAM_MEMBER_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  SALES_TEAM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/sales-team/sales-team-universal-identifiers.constant';

// The filter field is edited only through its editor on the team page, which
// checks the filter before it saves. The capacity is the sum of the active
// members' capacities, kept by the member trigger.
export default defineObject({
  universalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'crmTeam',
  namePlural: 'crmTeams',
  labelSingular: 'Sales team',
  labelPlural: 'Sales teams',
  description: 'A group of salespeople who share leads and a pipeline',
  icon: 'IconUsers',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    { universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Team name', icon: 'IconAbc', type: FieldType.TEXT },
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
    activeField(FIELD_IDS.active),
    manyToOneField({
      universalIdentifier: FIELD_IDS.leader,
      name: 'leader',
      label: 'Team leader',
      icon: 'IconUserStar',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.workspaceMemberCrmTeamsLed,
    }),
    booleanField(FIELD_IDS.useLeads, 'useLeads', 'Leads', 'IconFilter', false),
    booleanField(FIELD_IDS.useOpportunities, 'useOpportunities', 'Pipeline', 'IconLayoutKanban', true),
    booleanField(FIELD_IDS.assignmentOptout, 'assignmentOptout', 'Skip auto assignment', 'IconPlayerPause', false),
    { ...textField(FIELD_IDS.assignmentDomain, 'assignmentDomain', 'Assignment filter', 'IconFilter'), isUIEditable: false },
    appWritten(
      numberField(FIELD_IDS.assignmentMax, 'assignmentMax', 'Lead capacity (30 days)', 'IconGauge', { decimals: 0, int: true, defaultValue: 0 }),
    ),
    textField(FIELD_IDS.color, 'color', 'Color', 'IconPalette'),
    oneToManyField({
      universalIdentifier: FIELD_IDS.members,
      name: 'members',
      label: 'Members',
      icon: 'IconUsers',
      targetObjectUniversalIdentifier: CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_TEAM_MEMBER_FIELD_UNIVERSAL_IDENTIFIERS.crmTeam,
      junctionTargetFieldUniversalIdentifier: CRM_TEAM_MEMBER_FIELD_UNIVERSAL_IDENTIFIERS.user,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.stageLinks,
      name: 'stageLinks',
      label: 'Stages',
      icon: 'IconProgress',
      targetObjectUniversalIdentifier: CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.team,
      junctionTargetFieldUniversalIdentifier: CRM_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.stage,
    }),
    oneToManyField({
      universalIdentifier: INVERSE_IDS.crmTeamCrmLeads,
      name: 'crmLeads',
      label: 'Leads',
      icon: 'IconTarget',
      targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.crmLeadTeam,
    }),
    seedKeyField(FIELD_IDS.seedKey),
  ],
});
