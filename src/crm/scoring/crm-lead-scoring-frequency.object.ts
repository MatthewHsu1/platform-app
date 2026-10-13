import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  CRM_LEAD_SCORING_FREQUENCY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  CRM_LEAD_SCORING_FREQUENCY_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_SCORING_FREQUENCIES_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/crm/scoring/scoring-universal-identifiers.constant';
import { CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/sales-team/sales-team-universal-identifiers.constant';
import { appTextField, appWritten, manyToOneField, numberField } from 'src/shared/fields';

// How often each value was seen on won and on lost leads, per sales team
// (no team = the rows of leads without a team). Only the app writes them.
// Counts start at 0.1 so an unseen value never multiplies a score by zero.
export default defineObject({
  universalIdentifier: CRM_LEAD_SCORING_FREQUENCY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'crmLeadScoringFrequency',
  namePlural: 'crmLeadScoringFrequencies',
  labelSingular: 'Scoring row',
  labelPlural: 'Scoring rows',
  description: 'Won and lost counts per lead value, used to compute the automated probability',
  icon: 'IconChartBar',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.variable,
  fields: [
    appTextField(FIELD_IDS.variable, 'variable', 'Variable', 'IconVariable'),
    appTextField(FIELD_IDS.value, 'value', 'Value', 'IconAbc'),
    appWritten(numberField(FIELD_IDS.wonCount, 'wonCount', 'Won count', 'IconTrophy', { decimals: 1 })),
    appWritten(numberField(FIELD_IDS.lostCount, 'lostCount', 'Lost count', 'IconMoodSad', { decimals: 1 })),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.team,
        name: 'team',
        label: 'Sales team',
        icon: 'IconUsersGroup',
        targetObjectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: CRM_TEAM_SCORING_FREQUENCIES_FIELD_UNIVERSAL_IDENTIFIER,
        onDelete: OnDeleteAction.CASCADE,
      }),
    ),
  ],
});
