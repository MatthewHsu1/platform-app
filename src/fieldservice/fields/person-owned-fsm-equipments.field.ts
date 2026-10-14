import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  FIELDSERVICE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_EQUIPMENT_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELDSERVICE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.personOwnedFsmEquipments,
    name: 'fsmEquipmentsOwned',
    label: 'Owned equipment',
    icon: 'IconTool',
    targetObjectUniversalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FSM_EQUIPMENT_FIELD_UNIVERSAL_IDENTIFIERS.ownedByPerson,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
