import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';

// A contact's own address; a contact without one goes by its company's.
export default defineField({
  universalIdentifier: PERSON_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER,
  name: 'address',
  label: 'Address',
  type: FieldType.ADDRESS,
  icon: 'IconMap',
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
