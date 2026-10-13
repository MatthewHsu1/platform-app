import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import {
  CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  SALES_TEAM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/sales-team/sales-team-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: INVERSE_IDS.crmLeadTeam,
    name: 'team',
    label: 'Sales team',
    icon: 'IconUsers',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: INVERSE_IDS.crmTeamCrmLeads,
  }),
  objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
});
