import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  CRM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  SALES_TEAM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/sales-team/sales-team-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.workspaceMemberCrmTeamsLed,
    name: 'crmTeamsLed',
    label: 'Sales teams led',
    icon: 'IconUsers',
    targetObjectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: CRM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.leader,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
});
