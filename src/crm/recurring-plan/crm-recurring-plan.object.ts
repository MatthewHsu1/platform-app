import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_RECURRING_PLAN_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  CRM_RECURRING_PLAN_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import { activeField, numberField, oneToManyField, seedKeyField } from 'src/shared/fields';

// How a lead's recurring revenue spreads over months (a yearly plan divides by 12).
export default defineObject({
  universalIdentifier: CRM_RECURRING_PLAN_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'crmRecurringPlan',
  namePlural: 'crmRecurringPlans',
  labelSingular: 'Recurring plan',
  labelPlural: 'Recurring plans',
  description: 'A billing period for recurring revenue',
  icon: 'IconRepeat',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    {
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Plan name',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    },
    numberField(FIELD_IDS.numberOfMonths, 'numberOfMonths', 'Months', 'IconCalendar', { decimals: 0, int: true }),
    activeField(FIELD_IDS.active),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.crmLeads,
      name: 'crmLeads',
      label: 'Leads',
      icon: 'IconTarget',
      targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.recurringPlan,
    }),
    seedKeyField(FIELD_IDS.seedKey),
  ],
});
