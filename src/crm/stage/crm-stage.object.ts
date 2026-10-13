import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_STAGE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import {
  CRM_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/sales-team/sales-team-universal-identifiers.constant';
import { booleanField, numberField, oneToManyField, seedKeyField, textField } from 'src/shared/fields';

// Pipeline steps, in sequence order. A won stage puts its leads at 100 %;
// a folded stage is skipped when a lead needs a first stage.
export default defineObject({
  universalIdentifier: CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'crmStage',
  namePlural: 'crmStages',
  labelSingular: 'Stage',
  labelPlural: 'Stages',
  description: 'A step of the sales pipeline',
  icon: 'IconProgress',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    {
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    },
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 1 }),
    booleanField(FIELD_IDS.isWon, 'isWon', 'Is won stage', 'IconTrophy', false),
    numberField(FIELD_IDS.rottingThresholdDays, 'rottingThresholdDays', 'Days to rot', 'IconHourglass', {
      decimals: 0,
      int: true,
      defaultValue: 0,
    }),
    textField(FIELD_IDS.requirements, 'requirements', 'Requirements', 'IconChecklist'),
    booleanField(FIELD_IDS.fold, 'fold', 'Folded in pipeline', 'IconFold', false),
    textField(FIELD_IDS.color, 'color', 'Color', 'IconPalette'),
    oneToManyField({
      universalIdentifier: FIELD_IDS.crmLeads,
      name: 'crmLeads',
      label: 'Leads',
      icon: 'IconTarget',
      targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.stage,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.teams,
      name: 'teams',
      label: 'Teams',
      icon: 'IconUsers',
      targetObjectUniversalIdentifier: CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.stage,
      junctionTargetFieldUniversalIdentifier: CRM_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.team,
    }),
    seedKeyField(FIELD_IDS.seedKey),
  ],
});
