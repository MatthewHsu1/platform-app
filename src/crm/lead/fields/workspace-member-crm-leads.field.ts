import {
  defineField,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  WORKSPACE_MEMBER_CRM_LEADS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: WORKSPACE_MEMBER_CRM_LEADS_FIELD_UNIVERSAL_IDENTIFIER,
    name: 'crmLeads',
    label: 'Leads as salesperson',
    icon: 'IconTarget',
    targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.salesperson,
  }),
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
});
