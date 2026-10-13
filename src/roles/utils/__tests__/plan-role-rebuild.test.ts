import { describe, expect, it } from 'vitest';

import { type MixedRoleDefinition } from 'src/roles/types/mixed-role-definition.type';
import { type SnapshotRole } from 'src/roles/types/snapshot-role.type';
import { mixedRoleSettings, planRoleRebuild } from 'src/roles/utils/plan-role-rebuild.util';

const NONE = { canReadObjectRecords: false, canUpdateObjectRecords: false, canSoftDeleteObjectRecords: false, canDestroyObjectRecords: false };
const READ = { ...NONE, canReadObjectRecords: true };
const READ_WRITE = { ...READ, canUpdateObjectRecords: true };
const ALL = { canReadObjectRecords: true, canUpdateObjectRecords: true, canSoftDeleteObjectRecords: true, canDestroyObjectRecords: true };

// The workspace: one of Twenty's standard objects (person), one object an admin made in the
// workspace (pet), and two Platform objects: leads, which the Sales block opens, and warehouses,
// which no block in this mix opens.
const IDS = {
  objectIdByUniversalIdentifier: { 'uid-person': 'object-person', 'uid-pet': 'object-pet', 'uid-lead': 'object-lead', 'uid-warehouse': 'object-warehouse' },
  fieldIdByUniversalIdentifier: { 'uid-lead-margin': 'field-margin' },
  platformObjectUniversalIdentifiers: ['uid-lead', 'uid-warehouse'],
};

const DEFINITION: MixedRoleDefinition = {
  blockKeys: ['employee', 'sales.own'],
  label: 'Employee + Sales: Own Documents',
  objectRights: { 'uid-lead': READ_WRITE, 'uid-missing': READ },
  opensObjectsOutsidePlatform: true,
  hiddenFields: [{ objectUniversalIdentifier: 'uid-lead', fieldUniversalIdentifier: 'uid-lead-margin' }],
  permissionFlags: [],
  canAccessAllTools: true,
  rowRules: { 'uid-lead': 'mineOrUnowned' },
};

// A mix without Employee: nothing outside its blocks is open.
const CLOSED_DEFINITION: MixedRoleDefinition = { ...DEFINITION, blockKeys: ['sales.own'], label: 'Sales: Own Documents', opensObjectsOutsidePlatform: false };

const roleFor = (definition: MixedRoleDefinition, changes: Partial<SnapshotRole> = {}): SnapshotRole => ({
  ...mixedRoleSettings(definition),
  id: 'role-mix',
  universalIdentifier: 'uid-role-mix',
  memberIds: [],
  objectPermissions: [],
  permissionFlags: [],
  fieldPermissions: [],
  ...changes,
});

const HIDDEN_MARGIN = { objectMetadataId: 'object-lead', fieldMetadataId: 'field-margin', canReadFieldValue: false, canUpdateFieldValue: false };

const plan = (role: SnapshotRole, definition: MixedRoleDefinition = DEFINITION) => planRoleRebuild({ definition, role, ...IDS });

describe('mixedRoleSettings', () => {
  it("with Employee opens every record role-wide as Twenty's Member does, is assignable to people only, and opens the tools as the blocks say", () => {
    expect(mixedRoleSettings(DEFINITION)).toEqual({
      label: 'Employee + Sales: Own Documents',
      description: "Made by Platform from building blocks. Change people's roles on Platform's Roles page; edits made here are put back.",
      canUpdateAllSettings: false,
      canAccessAllTools: true,
      canReadAllObjectRecords: true,
      canUpdateAllObjectRecords: true,
      canSoftDeleteAllObjectRecords: true,
      canDestroyAllObjectRecords: true,
      canBeAssignedToUsers: true,
      canBeAssignedToAgents: false,
      canBeAssignedToApiKeys: false,
    });
  });

  it('without Employee opens no record role-wide', () => {
    expect(mixedRoleSettings(CLOSED_DEFINITION)).toMatchObject({
      canReadAllObjectRecords: false,
      canUpdateAllObjectRecords: false,
      canSoftDeleteAllObjectRecords: false,
      canDestroyAllObjectRecords: false,
    });
  });
});

describe('planRoleRebuild', () => {
  it('closes every Platform object no block opens, opens the ones a block opens, and leaves standard and workspace-made objects to the role-wide rights', () => {
    expect(plan(roleFor(DEFINITION))).toEqual([
      {
        kind: 'objects',
        roleId: 'role-mix',
        objectPermissions: [
          { objectMetadataId: 'object-lead', ...READ_WRITE },
          { objectMetadataId: 'object-warehouse', ...NONE },
        ],
      },
      { kind: 'fields', roleId: 'role-mix', fieldPermissions: [HIDDEN_MARGIN] },
    ]);
  });

  it('writes nothing for a role that already matches', () => {
    const role = roleFor(DEFINITION, {
      objectPermissions: [
        { objectMetadataId: 'object-warehouse', ...NONE },
        { objectMetadataId: 'object-lead', ...READ_WRITE },
      ],
      fieldPermissions: [HIDDEN_MARGIN],
    });

    expect(plan(role)).toEqual([]);
  });

  it('reads an empty right on a Platform object as the role-wide right, so an open one is closed again', () => {
    const role = roleFor(DEFINITION, {
      objectPermissions: [
        { objectMetadataId: 'object-lead', canReadObjectRecords: true, canUpdateObjectRecords: true, canSoftDeleteObjectRecords: false, canDestroyObjectRecords: false },
        { objectMetadataId: 'object-warehouse', canReadObjectRecords: null, canUpdateObjectRecords: null, canSoftDeleteObjectRecords: null, canDestroyObjectRecords: null },
      ],
      fieldPermissions: [HIDDEN_MARGIN],
    });

    expect(plan(role)).toEqual([
      {
        kind: 'objects',
        roleId: 'role-mix',
        objectPermissions: [
          { objectMetadataId: 'object-lead', ...READ_WRITE },
          { objectMetadataId: 'object-warehouse', ...NONE },
        ],
      },
    ]);
  });

  it('reads an empty right as no right on a role that opens nothing role-wide', () => {
    const role = roleFor(CLOSED_DEFINITION, {
      objectPermissions: [
        { objectMetadataId: 'object-lead', canReadObjectRecords: true, canUpdateObjectRecords: true, canSoftDeleteObjectRecords: null, canDestroyObjectRecords: null },
        { objectMetadataId: 'object-warehouse', canReadObjectRecords: null, canUpdateObjectRecords: null, canSoftDeleteObjectRecords: null, canDestroyObjectRecords: null },
      ],
      fieldPermissions: [HIDDEN_MARGIN],
    });

    expect(plan(role, CLOSED_DEFINITION)).toEqual([]);
  });

  it('takes away a limit put by hand on a standard object', () => {
    const role = roleFor(DEFINITION, {
      objectPermissions: [
        { objectMetadataId: 'object-lead', ...READ_WRITE },
        { objectMetadataId: 'object-warehouse', ...NONE },
        { objectMetadataId: 'object-person', ...READ },
      ],
      fieldPermissions: [HIDDEN_MARGIN],
    });

    expect(plan(role)).toEqual([
      {
        kind: 'objects',
        roleId: 'role-mix',
        objectPermissions: [
          { objectMetadataId: 'object-lead', ...READ_WRITE },
          { objectMetadataId: 'object-warehouse', ...NONE },
        ],
      },
    ]);
  });

  it('gives a role without Employee the rights its blocks list on an object outside Platform', () => {
    const definition: MixedRoleDefinition = { ...CLOSED_DEFINITION, objectRights: { ...CLOSED_DEFINITION.objectRights, 'uid-person': READ } };

    expect(plan(roleFor(definition, { fieldPermissions: [HIDDEN_MARGIN] }), definition)).toEqual([
      {
        kind: 'objects',
        roleId: 'role-mix',
        objectPermissions: [
          { objectMetadataId: 'object-lead', ...READ_WRITE },
          { objectMetadataId: 'object-person', ...READ },
          { objectMetadataId: 'object-warehouse', ...NONE },
        ],
      },
    ]);
  });

  it('puts back settings, rights, flags and field limits changed by hand', () => {
    const role = roleFor(DEFINITION, {
      label: 'Renamed by hand',
      canReadAllObjectRecords: false,
      objectPermissions: [
        { objectMetadataId: 'object-lead', ...ALL },
        { objectMetadataId: 'object-warehouse', ...READ },
      ],
      permissionFlags: ['WORKFLOWS'],
      fieldPermissions: [HIDDEN_MARGIN, { objectMetadataId: 'object-warehouse', fieldMetadataId: 'field-name', canReadFieldValue: null, canUpdateFieldValue: false }],
    });

    expect(plan(role)).toEqual([
      { kind: 'role', roleId: 'role-mix', settings: mixedRoleSettings(DEFINITION) },
      {
        kind: 'objects',
        roleId: 'role-mix',
        objectPermissions: [
          { objectMetadataId: 'object-lead', ...READ_WRITE },
          { objectMetadataId: 'object-warehouse', ...NONE },
        ],
      },
      { kind: 'flags', roleId: 'role-mix', permissionFlagKeys: [] },
      {
        kind: 'fields',
        roleId: 'role-mix',
        fieldPermissions: [{ objectMetadataId: 'object-warehouse', fieldMetadataId: 'field-name', canReadFieldValue: null, canUpdateFieldValue: null }],
      },
    ]);
  });
});
