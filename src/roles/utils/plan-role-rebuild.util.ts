import { type MixedRoleDefinition } from 'src/roles/types/mixed-role-definition.type';
import { type MixedRoleSettings } from 'src/roles/types/mixed-role-settings.type';
import { type ObjectRightsFlags } from 'src/roles/types/object-rights-flags.type';
import { type RoleWrite } from 'src/roles/types/role-write.type';
import { type SnapshotRole } from 'src/roles/types/snapshot-role.type';
import { sameValue } from 'src/shared/utils/same-value.util';

type ObjectPermission = Extract<RoleWrite, { kind: 'objects' }>['objectPermissions'][number];
type FieldPermission = Extract<RoleWrite, { kind: 'fields' }>['fieldPermissions'][number];

const DESCRIPTION = "Made by Platform from building blocks. Change people's roles on Platform's Roles page; edits made here are put back.";

const allRights = (value: boolean): ObjectRightsFlags => ({
  canReadObjectRecords: value,
  canUpdateObjectRecords: value,
  canSoftDeleteObjectRecords: value,
  canDestroyObjectRecords: value,
});

// A role holding Employee opens every record role-wide, as Twenty's Member does, so objects made
// later outside Platform are open too; Platform's own objects are then closed one by one.
export const mixedRoleSettings = (definition: MixedRoleDefinition): MixedRoleSettings => ({
  label: definition.label,
  description: DESCRIPTION,
  canUpdateAllSettings: false,
  canAccessAllTools: definition.canAccessAllTools,
  canReadAllObjectRecords: definition.opensObjectsOutsidePlatform,
  canUpdateAllObjectRecords: definition.opensObjectsOutsidePlatform,
  canSoftDeleteAllObjectRecords: definition.opensObjectsOutsidePlatform,
  canDestroyAllObjectRecords: definition.opensObjectsOutsidePlatform,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
});

const byObject = (left: { objectMetadataId: string }, right: { objectMetadataId: string }) => left.objectMetadataId.localeCompare(right.objectMetadataId);

const fieldKey = (field: { objectMetadataId: string; fieldMetadataId: string }) => `${field.objectMetadataId}:${field.fieldMetadataId}`;

// The object rows a mixed role needs: one per Platform object (closed unless a block opens it),
// and, on a role that opens nothing role-wide, the rights blocks list on other objects. A role
// that opens everything role-wide needs no row outside Platform: adding Member's rights to a
// block's rights gives Member's rights.
const desiredObjectRows = (
  definition: MixedRoleDefinition,
  objectIdByUniversalIdentifier: Record<string, string>,
  platformObjects: Set<string>,
): ObjectPermission[] => {
  const rightsByObject = new Map<string, ObjectRightsFlags>();

  for (const universalIdentifier of platformObjects) {
    rightsByObject.set(universalIdentifier, definition.objectRights[universalIdentifier] ?? allRights(false));
  }
  if (!definition.opensObjectsOutsidePlatform) {
    for (const [universalIdentifier, flags] of Object.entries(definition.objectRights)) {
      rightsByObject.set(universalIdentifier, flags);
    }
  }

  return [...rightsByObject].flatMap(([universalIdentifier, flags]) => {
    const objectMetadataId = objectIdByUniversalIdentifier[universalIdentifier];

    return objectMetadataId === undefined ? [] : [{ objectMetadataId, ...flags }];
  });
};

// What a role can do on each object it has a row for or should have one for, as Twenty reads it:
// an empty right, or no row, falls back to the role-wide right.
const effectiveRights = (rows: SnapshotRole['objectPermissions'], objectIds: string[], roleWide: boolean): ObjectPermission[] =>
  objectIds.map((objectMetadataId) => {
    const row = rows.find((candidate) => candidate.objectMetadataId === objectMetadataId);

    return {
      objectMetadataId,
      canReadObjectRecords: row?.canReadObjectRecords ?? roleWide,
      canUpdateObjectRecords: row?.canUpdateObjectRecords ?? roleWide,
      canSoftDeleteObjectRecords: row?.canSoftDeleteObjectRecords ?? roleWide,
      canDestroyObjectRecords: row?.canDestroyObjectRecords ?? roleWide,
    };
  });

// The writes that make a mixed role match its blocks. Objects and fields this workspace does not
// have are left out; nothing is written when the role already matches.
export const planRoleRebuild = ({
  definition,
  role,
  objectIdByUniversalIdentifier,
  fieldIdByUniversalIdentifier,
  platformObjectUniversalIdentifiers,
}: {
  definition: MixedRoleDefinition;
  role: SnapshotRole;
  objectIdByUniversalIdentifier: Record<string, string>;
  fieldIdByUniversalIdentifier: Record<string, string>;
  platformObjectUniversalIdentifiers: string[];
}): RoleWrite[] => {
  const writes: RoleWrite[] = [];
  const settings = mixedRoleSettings(definition);

  if ((Object.keys(settings) as (keyof MixedRoleSettings)[]).some((key) => role[key] !== settings[key])) {
    writes.push({ kind: 'role', roleId: role.id, settings });
  }

  const desiredObjects = desiredObjectRows(definition, objectIdByUniversalIdentifier, new Set(platformObjectUniversalIdentifiers)).sort(byObject);
  const comparedObjectIds = [...new Set([...desiredObjects, ...role.objectPermissions].map((row) => row.objectMetadataId))].sort();
  const roleWide = definition.opensObjectsOutsidePlatform;

  if (!sameValue(effectiveRights(desiredObjects, comparedObjectIds, roleWide), effectiveRights(role.objectPermissions, comparedObjectIds, roleWide))) {
    writes.push({ kind: 'objects', roleId: role.id, objectPermissions: desiredObjects });
  }

  if (!sameValue(definition.permissionFlags, [...role.permissionFlags].sort())) {
    writes.push({ kind: 'flags', roleId: role.id, permissionFlagKeys: definition.permissionFlags });
  }

  const desiredHidden = new Map<string, FieldPermission>(
    definition.hiddenFields.flatMap((field): [string, FieldPermission][] => {
      const objectMetadataId = objectIdByUniversalIdentifier[field.objectUniversalIdentifier];
      const fieldMetadataId = fieldIdByUniversalIdentifier[field.fieldUniversalIdentifier];

      if (objectMetadataId === undefined || fieldMetadataId === undefined) {
        return [];
      }
      const permission: FieldPermission = { objectMetadataId, fieldMetadataId, canReadFieldValue: false, canUpdateFieldValue: false };

      return [[fieldKey(permission), permission]];
    }),
  );
  const currentLimits = role.fieldPermissions.filter((field) => field.canReadFieldValue === false || field.canUpdateFieldValue === false);
  const fieldWrites: FieldPermission[] = [
    ...[...desiredHidden.values()].filter(
      (desired) =>
        !currentLimits.some(
          (current) => fieldKey(current) === fieldKey(desired) && current.canReadFieldValue === false && current.canUpdateFieldValue === false,
        ),
    ),
    ...currentLimits
      .filter((current) => !desiredHidden.has(fieldKey(current)))
      .map((current): FieldPermission => ({ objectMetadataId: current.objectMetadataId, fieldMetadataId: current.fieldMetadataId, canReadFieldValue: null, canUpdateFieldValue: null })),
  ];

  if (fieldWrites.length > 0) {
    writes.push({ kind: 'fields', roleId: role.id, fieldPermissions: fieldWrites });
  }

  return writes;
};
