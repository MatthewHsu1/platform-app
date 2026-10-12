import { type BuildingBlock } from 'src/roles/types/building-block.type';
import { type HiddenField } from 'src/roles/types/hidden-field.type';
import { type MixedRoleDefinition } from 'src/roles/types/mixed-role-definition.type';
import { type ObjectRightsFlags } from 'src/roles/types/object-rights-flags.type';
import { type RoleModule } from 'src/roles/types/role-module.type';
import { type RowRuleScope } from 'src/roles/types/row-rule-scope.type';
import { closeBlocks } from 'src/roles/utils/close-blocks.util';
import { mixedRoleLabel } from 'src/roles/utils/mixed-role-label.util';
import { rightsToPermission } from 'src/roles/utils/role-rights.util';

const SCOPE_WIDTH: Record<RowRuleScope, number> = { mine: 0, mineOrUnowned: 1, all: 2 };

const NO_RIGHTS: ObjectRightsFlags = {
  canReadObjectRecords: false,
  canUpdateObjectRecords: false,
  canSoftDeleteObjectRecords: false,
  canDestroyObjectRecords: false,
};

const unionRights = (left: ObjectRightsFlags, right: ObjectRightsFlags): ObjectRightsFlags => ({
  canReadObjectRecords: left.canReadObjectRecords || right.canReadObjectRecords,
  canUpdateObjectRecords: left.canUpdateObjectRecords || right.canUpdateObjectRecords,
  canSoftDeleteObjectRecords: left.canSoftDeleteObjectRecords || right.canSoftDeleteObjectRecords,
  canDestroyObjectRecords: left.canDestroyObjectRecords || right.canDestroyObjectRecords,
});

const opensObject = (block: BuildingBlock, objectUniversalIdentifier: string) =>
  block.objectRights.some((entry) => entry.objectUniversalIdentifier === objectUniversalIdentifier && entry.rights !== '-');

const sameField = (left: HiddenField, right: HiddenField) =>
  left.objectUniversalIdentifier === right.objectUniversalIdentifier && left.fieldUniversalIdentifier === right.fieldUniversalIdentifier;

// One role from a set of blocks, as a user holding several groups gets their rights: object rights
// and flags add up; a field stays hidden only if every block that opens its object hides it; per
// object, the row rules of the blocks that have one are joined and the widest wins, and a block
// with no rule there does not widen it.
//
// An object Platform does not own is opened without hiding anything by any block that opens
// objects outside Platform. platformObjects names Platform's objects; by default they are the ones
// some block lists.
export const mixBlocks = (
  blockKeys: string[],
  blocks: BuildingBlock[],
  modules: RoleModule[],
  platformObjects: Set<string> = new Set(blocks.flatMap((block) => block.objectRights.map((entry) => entry.objectUniversalIdentifier))),
): MixedRoleDefinition => {
  const closedKeys = closeBlocks(blockKeys, blocks);
  const chosen = blocks.filter((block) => closedKeys.includes(block.key));
  const objectRights: Record<string, ObjectRightsFlags> = {};
  const rowRules: Record<string, RowRuleScope> = {};

  for (const block of chosen) {
    for (const { objectUniversalIdentifier, rights } of block.objectRights) {
      const permission = rightsToPermission(objectUniversalIdentifier, rights);

      objectRights[objectUniversalIdentifier] = unionRights(objectRights[objectUniversalIdentifier] ?? NO_RIGHTS, {
        canReadObjectRecords: permission.canReadObjectRecords,
        canUpdateObjectRecords: permission.canUpdateObjectRecords,
        canSoftDeleteObjectRecords: permission.canSoftDeleteObjectRecords,
        canDestroyObjectRecords: permission.canDestroyObjectRecords,
      });
    }
    for (const { objectUniversalIdentifier, scope } of block.rowRules) {
      const current = rowRules[objectUniversalIdentifier];

      rowRules[objectUniversalIdentifier] = current === undefined || SCOPE_WIDTH[scope] > SCOPE_WIDTH[current] ? scope : current;
    }
  }

  // An object only '-' rows name has no read right and stays closed.
  for (const [objectUniversalIdentifier, flags] of Object.entries(objectRights)) {
    if (!flags.canReadObjectRecords) {
      delete objectRights[objectUniversalIdentifier];
    }
  }

  const candidates = chosen.flatMap((block) => block.hiddenFields).filter((field, index, all) => all.findIndex((other) => sameField(other, field)) === index);
  const hiddenFields = candidates.filter((field) =>
    chosen
      .filter(
        (block) =>
          opensObject(block, field.objectUniversalIdentifier) ||
          (block.opensObjectsOutsidePlatform && !platformObjects.has(field.objectUniversalIdentifier)),
      )
      .every((block) => block.hiddenFields.some((hidden) => sameField(hidden, field))),
  );

  return {
    blockKeys: closedKeys,
    label: mixedRoleLabel(closedKeys, blocks, modules),
    objectRights,
    opensObjectsOutsidePlatform: chosen.some((block) => block.opensObjectsOutsidePlatform),
    hiddenFields: hiddenFields.filter((field) => objectRights[field.objectUniversalIdentifier] !== undefined),
    permissionFlags: [...new Set(chosen.flatMap((block) => block.permissionFlags))].sort(),
    canAccessAllTools: chosen.some((block) => block.canAccessAllTools),
    rowRules,
  };
};
