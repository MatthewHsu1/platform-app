import { defineObject, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { activeField, appTextField, booleanField, manyToOneField, numberField, textField } from 'src/shared/fields';
import {
  CRM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_TEAM_MEMBER_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  SALES_TEAM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/sales-team/sales-team-universal-identifiers.constant';

// One salesperson in one team. The same pair may repeat while all but one
// row are archived, so there is no unique index; the member trigger refuses a
// second active row. `name` shows the salesperson's name and follows them.
export default defineObject({
  universalIdentifier: CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'crmTeamMember',
  namePlural: 'crmTeamMembers',
  labelSingular: 'Team member',
  labelPlural: 'Team members',
  description: 'A salesperson in a sales team, with a lead capacity',
  icon: 'IconUserCircle',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appTextField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.crmTeam,
      name: 'crmTeam',
      label: 'Sales team',
      icon: 'IconUsers',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.members,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.salesUser,
      name: 'salesUser',
      label: 'Salesperson',
      icon: 'IconUserCircle',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.workspaceMemberCrmTeamMembers,
    }),
    activeField(FIELD_IDS.active),
    numberField(FIELD_IDS.assignmentMax, 'assignmentMax', 'Lead capacity (30 days)', 'IconGauge', { decimals: 0, int: true, defaultValue: 30 }),
    booleanField(FIELD_IDS.assignmentOptout, 'assignmentOptout', 'Pause assignment', 'IconPlayerPause', false),
    { ...textField(FIELD_IDS.assignmentDomain, 'assignmentDomain', 'Assignment filter', 'IconFilter'), isUIEditable: false },
    {
      ...textField(FIELD_IDS.assignmentDomainPreferred, 'assignmentDomainPreferred', 'Preferred filter', 'IconFilterStar'),
      isUIEditable: false,
    },
  ],
});
