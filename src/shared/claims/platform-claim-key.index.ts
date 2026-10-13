import { defineIndex } from 'twenty-sdk/define';

import {
  PLATFORM_CLAIM_FIELD_UNIVERSAL_IDENTIFIERS,
  PLATFORM_CLAIM_KEY_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  PLATFORM_CLAIM_KEY_INDEX_UNIVERSAL_IDENTIFIER,
  PLATFORM_CLAIM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/shared/claims/claims-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: PLATFORM_CLAIM_KEY_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PLATFORM_CLAIM_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: PLATFORM_CLAIM_KEY_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: PLATFORM_CLAIM_FIELD_UNIVERSAL_IDENTIFIERS.key,
    },
  ],
});
