import { defineObject } from 'twenty-sdk/define';

import { STAGE_RULE_FIELD_OPTIONS } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-options.constant';
import {
  FSM_STAGE_RULE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_STAGE_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-stage-validation/fieldservice-stage-validation-universal-identifiers.constant';
import { multiSelectField, textField } from 'src/shared/fields';

// The fields a service order must have set before it may move into a stage. The stage list on this object is a
// staff list the install hook makes, a copy of the order's stage list: a stage staff add to the order is added
// here too. Several rows for one stage add up.
export default defineObject({
  universalIdentifier: FSM_STAGE_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmStageRule',
  namePlural: 'fsmStageRules',
  labelSingular: 'Stage rule',
  labelPlural: 'Stage rules',
  description: 'The fields a service order needs before it moves into a stage',
  icon: 'IconChecklist',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    multiSelectField(FIELD_IDS.requiredFields, 'requiredFields', 'Required fields', 'IconListCheck', STAGE_RULE_FIELD_OPTIONS),
  ],
});
