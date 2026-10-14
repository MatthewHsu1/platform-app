import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { RES_TERRITORY_FIELD_UNIVERSAL_IDENTIFIERS, RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base-territory/base-territory-universal-identifiers.constant';
import {
  FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_RES_TERRITORY_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_PERSON_RES_TERRITORY_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Deleting either side removes the link row (the triggers destroy it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: FSM_PERSON_RES_TERRITORY_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmPersonResTerritoryRel',
  namePlural: 'fsmPersonResTerritoryRels',
  labelSingular: 'Worker territory link',
  labelPlural: 'Worker territory links',
  description: 'Puts a field service worker in a territory',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.person,
      name: 'person',
      label: 'Worker',
      icon: 'IconUserCog',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS.territories,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.territory,
      name: 'territory',
      label: 'Territory',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RES_TERRITORY_FIELD_UNIVERSAL_IDENTIFIERS.persons,
    }),
  ],
});
