import { defineIndex } from 'twenty-sdk/define';

import {
  CRM_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_STAGE_TEAM_PAIR_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
  CRM_STAGE_TEAM_PAIR_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
  CRM_STAGE_TEAM_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/sales-team/sales-team-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: CRM_STAGE_TEAM_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: CRM_STAGE_TEAM_PAIR_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER, fieldUniversalIdentifier: FIELD_IDS.stage },
    { universalIdentifier: CRM_STAGE_TEAM_PAIR_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER, fieldUniversalIdentifier: FIELD_IDS.team },
  ],
});
