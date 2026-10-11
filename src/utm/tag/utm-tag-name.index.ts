import { defineIndex } from 'twenty-sdk/define';

import {
  UTM_TAG_FIELD_UNIVERSAL_IDENTIFIERS,
  UTM_TAG_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  UTM_TAG_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: UTM_TAG_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [{ universalIdentifier: UTM_TAG_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIER, fieldUniversalIdentifier: UTM_TAG_FIELD_UNIVERSAL_IDENTIFIERS.name }],
});
