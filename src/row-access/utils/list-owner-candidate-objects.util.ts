import { type MetadataObject } from 'src/row-access/types/metadata-object.type';
import { type OwnerCandidateObject } from 'src/row-access/types/owner-candidate-object.type';
import { isRuleObjectAllowed } from 'src/row-access/utils/is-rule-object-allowed.util';
import { type RuleObject } from 'src/row-access/types/rule-object.type';

const WORKSPACE_MEMBER_NAME_SINGULAR = 'workspaceMember';

export const listRuleObjects = (
  objects: MetadataObject[],
  workspaceCustomApplicationId: string | undefined,
  ownApplicationIds: string[] = [],
): RuleObject[] =>
  objects
    .filter(
      (object) =>
        object.isActive &&
        isRuleObjectAllowed(
          object,
          workspaceCustomApplicationId,
          ownApplicationIds,
        ),
    )
    .map((object) => ({
      objectMetadataId: object.id,
      label: object.labelSingular,
    }));

// Objects the admin may protect: active, audited (company, opportunity, task,
// a workspace custom object or an object of Platform; never a system
// object), with at least one active
// MANY_TO_ONE relation to workspaceMember. The server checks the same before
// it applies a rule.
export const listOwnerCandidateObjects = (
  objects: MetadataObject[],
  workspaceCustomApplicationId: string | undefined,
  ownApplicationIds: string[] = [],
): OwnerCandidateObject[] =>
  objects
    .filter(
      (object) =>
        object.isActive &&
        isRuleObjectAllowed(
          object,
          workspaceCustomApplicationId,
          ownApplicationIds,
        ),
    )
    .map((object) => ({
      objectMetadataId: object.id,
      label: object.labelSingular,
      ownerFields: object.fieldsList
        .filter(
          (field) =>
            field.isActive !== false &&
            field.type === 'RELATION' &&
            field.relation?.type === 'MANY_TO_ONE' &&
            field.relation.targetObjectMetadata.nameSingular ===
              WORKSPACE_MEMBER_NAME_SINGULAR,
        )
        .map((field) => ({ fieldMetadataId: field.id, label: field.label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    }))
    .filter((object) => object.ownerFields.length > 0)
    .sort((left, right) => left.label.localeCompare(right.label));
