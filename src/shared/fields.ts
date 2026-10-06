import { FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

export const manyToOneField = ({
  universalIdentifier,
  name,
  label,
  icon,
  targetObjectUniversalIdentifier,
  targetFieldUniversalIdentifier,
}: {
  universalIdentifier: string;
  name: string;
  label: string;
  icon: string;
  targetObjectUniversalIdentifier: string;
  targetFieldUniversalIdentifier: string;
}) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.RELATION as const,
  relationTargetObjectMetadataUniversalIdentifier:
    targetObjectUniversalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: targetFieldUniversalIdentifier,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: `${name}Id`,
  },
});

export const oneToManyField = ({
  universalIdentifier,
  name,
  label,
  icon,
  targetObjectUniversalIdentifier,
  targetFieldUniversalIdentifier,
}: {
  universalIdentifier: string;
  name: string;
  label: string;
  icon: string;
  targetObjectUniversalIdentifier: string;
  targetFieldUniversalIdentifier: string;
}) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.RELATION as const,
  relationTargetObjectMetadataUniversalIdentifier:
    targetObjectUniversalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: targetFieldUniversalIdentifier,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});

// the reference's `active` flag on lookup rows: staff retire a row instead of deleting
// it, so old records keep their link.
export const activeField = (universalIdentifier: string) => ({
  universalIdentifier,
  name: 'active',
  label: 'Active',
  type: FieldType.BOOLEAN as const,
  icon: 'IconCircleCheck',
  defaultValue: true,
});
