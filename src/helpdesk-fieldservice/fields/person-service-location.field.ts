import { defineField, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { HELPDESK_FIELDSERVICE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// The location a new work case of this contact starts with.
export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELD_IDS.personServiceLocation,
    name: 'serviceLocation',
    label: 'Primary service location',
    icon: 'IconMapPin',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.fsmLocationServicePersons,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
