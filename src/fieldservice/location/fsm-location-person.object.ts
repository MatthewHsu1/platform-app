import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_LOCATION_PERSON_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_LOCATION_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField, numberField } from 'src/shared/fields';

// The ranked workers of a location, each once. Deleting either side removes the row for good (the triggers
// destroy it), so the same worker can be linked again.
export default defineObject({
  universalIdentifier: FSM_LOCATION_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmLocationPerson',
  namePlural: 'fsmLocationPersons',
  labelSingular: 'Location worker',
  labelPlural: 'Location workers',
  description: 'A field service worker linked to a service location, in rank order',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.location,
      name: 'location',
      label: 'Location',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS.persons,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.person,
      name: 'person',
      label: 'Worker',
      icon: 'IconUserCog',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS.locations,
    }),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
  ],
});
