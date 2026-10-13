import { OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';

type LinkSide = {
  universalIdentifier: string;
  name: string;
  label: string;
  icon: string;
  targetObjectUniversalIdentifier: string;
  targetFieldUniversalIdentifier: string;
};

// A many-to-many link row: two relations, both deleted with either side.
export const linkObjectConfig = ({
  universalIdentifier,
  nameSingular,
  namePlural,
  labelSingular,
  labelPlural,
  description,
  sides,
}: {
  universalIdentifier: string;
  nameSingular: string;
  namePlural: string;
  labelSingular: string;
  labelPlural: string;
  description: string;
  sides: [LinkSide, LinkSide];
}) => ({
  universalIdentifier,
  nameSingular,
  namePlural,
  labelSingular,
  labelPlural,
  description,
  icon: 'IconLink',
  fields: sides.map((side) => manyToOneField({ ...side, onDelete: OnDeleteAction.CASCADE })),
});

// The unique index on a link row's two relations.
export const linkIndexConfig = ({
  objectUniversalIdentifier,
  ids: [indexId, firstId, secondId],
  fieldUniversalIdentifiers: [firstField, secondField],
}: {
  objectUniversalIdentifier: string;
  ids: [string, string, string];
  fieldUniversalIdentifiers: [string, string];
}) => ({
  universalIdentifier: indexId,
  objectUniversalIdentifier,
  isUnique: true,
  fields: [
    { universalIdentifier: firstId, fieldUniversalIdentifier: firstField },
    { universalIdentifier: secondId, fieldUniversalIdentifier: secondField },
  ],
});
