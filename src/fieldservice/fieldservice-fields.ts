import { FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';

export const dateTimeField = (universalIdentifier: string, name: string, label: string, icon: string) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.DATE_TIME as const,
});

export const dateField = (universalIdentifier: string, name: string, label: string, icon: string) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.DATE as const,
});

export const richTextField = (universalIdentifier: string, name: string, label: string, icon: string) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.RICH_TEXT as const,
});

// A link to one level of the service area tree; a deleted area leaves the record without it.
export const areaField = (
  universalIdentifier: string,
  name: string,
  label: string,
  icon: string,
  targetObjectUniversalIdentifier: string,
  targetFieldUniversalIdentifier: string,
) =>
  manyToOneField({
    universalIdentifier,
    name,
    label,
    icon,
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier,
    targetFieldUniversalIdentifier,
  });
