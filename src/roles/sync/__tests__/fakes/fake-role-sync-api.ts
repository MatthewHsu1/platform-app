import { type MixTable } from 'src/roles/types/mix-table.type';
import { type RoleSyncApi } from 'src/roles/types/role-sync-api.type';
import { type SnapshotMember } from 'src/roles/types/snapshot-member.type';
import { type SnapshotRole } from 'src/roles/types/snapshot-role.type';

export const ADMIN_UID = '20202020-02c2-43f2-b94d-cab1f2b532eb';

const baseRole = (id: string, label: string, memberIds: string[], universalIdentifier: string | null = null): SnapshotRole => ({
  id,
  label,
  description: null,
  universalIdentifier,
  canUpdateAllSettings: false,
  canAccessAllTools: true,
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: true,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  memberIds,
  objectPermissions: [],
  permissionFlags: [],
  fieldPermissions: [],
});

export const MEMBERS: SnapshotMember[] = [
  { id: 'member-admin', name: 'Ada Admin', email: 'admin@choice.dev' },
  { id: 'member-repa', name: 'Rep A', email: 'repa@choice.dev' },
  { id: 'member-repb', name: 'Rep B', email: 'repb@choice.dev' },
];

// Twenty keeps the key-value store as Postgres jsonb, which hands object keys back shortest first,
// then in byte order: not in the order they were written.
const jsonbOrder = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(jsonbOrder);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.length - right.length || (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => [key, jsonbOrder(entry)]),
  );
};

export const makeFakeRoleSyncApi = ({
  objectIdByUniversalIdentifier,
  platformObjectUniversalIdentifiers,
  mixTable = null,
  refuseAssignment = false,
  refuseWritesTo = [],
}: {
  objectIdByUniversalIdentifier: Record<string, string>;
  platformObjectUniversalIdentifiers: string[];
  mixTable?: unknown;
  refuseAssignment?: boolean;
  refuseWritesTo?: string[];
}) => {
  const state = {
    roles: [baseRole('role-admin', 'Admin', ['member-admin'], ADMIN_UID), baseRole('role-member', 'Member', ['member-repa', 'member-repb'])],
    defaultRoleId: 'role-member',
    mixTable: jsonbOrder(mixTable),
    rowAccess: null as string | null,
  };
  const calls: string[] = [];
  const findRole = (roleId: string) => {
    const role = state.roles.find((candidate) => candidate.id === roleId);

    if (role === undefined) {
      throw new Error(`no role ${roleId}`);
    }

    return role;
  };
  const moveMember = (memberId: string, roleId: string) => {
    state.roles.forEach((role) => {
      role.memberIds = role.memberIds.filter((id) => id !== memberId);
    });
    findRole(roleId).memberIds.push(memberId);
  };

  const api: RoleSyncApi = {
    readSnapshot: async () => ({
      workspaceId: 'ws-1',
      defaultRoleId: state.defaultRoleId,
      objectIdByUniversalIdentifier,
      fieldIdByUniversalIdentifier: {},
      platformObjectUniversalIdentifiers,
      roles: structuredClone(state.roles),
      members: MEMBERS,
    }),
    readMixTable: async () => structuredClone(state.mixTable),
    writeMixTable: async (table: MixTable) => {
      calls.push('writeMixTable');
      state.mixTable = jsonbOrder(table);
    },
    createRole: async ({ id, settings }) => {
      calls.push(`createRole ${settings.label}`);
      state.roles.push({ ...settings, id, universalIdentifier: `uid-${id}`, memberIds: [], objectPermissions: [], permissionFlags: [], fieldPermissions: [] });
    },
    applyWrite: async (write) => {
      calls.push(`${write.kind} ${write.roleId}`);
      if (refuseWritesTo.includes(write.roleId)) {
        throw new Error('A role with this label already exists');
      }
      const role = findRole(write.roleId);

      if (write.kind === 'role') {
        Object.assign(role, write.settings);
      } else if (write.kind === 'objects') {
        role.objectPermissions = structuredClone(write.objectPermissions);
      } else if (write.kind === 'flags') {
        role.permissionFlags = [...write.permissionFlagKeys];
      } else {
        for (const field of write.fieldPermissions) {
          role.fieldPermissions = role.fieldPermissions.filter(
            (current) => current.objectMetadataId !== field.objectMetadataId || current.fieldMetadataId !== field.fieldMetadataId,
          );
          if (field.canReadFieldValue !== null || field.canUpdateFieldValue !== null) {
            role.fieldPermissions.push({ ...field });
          }
        }
      }
    },
    assignRole: async (memberId, roleId) => {
      calls.push(`assignRole ${memberId} ${roleId}`);
      if (refuseAssignment) {
        throw new Error('Cannot update self role');
      }
      moveMember(memberId, roleId);
    },
    deleteRole: async (roleId) => {
      calls.push(`deleteRole ${roleId}`);
      // Twenty puts the holders of a deleted role on the default role.
      findRole(roleId).memberIds.forEach((memberId) => moveMember(memberId, state.defaultRoleId));
      state.roles = state.roles.filter((role) => role.id !== roleId);
    },
    readRowAccessConfig: async () => state.rowAccess,
    writeRowAccessConfig: async (value) => {
      calls.push('writeRowAccessConfig');
      state.rowAccess = value;
    },
  };

  return { api, state, calls, findRole };
};
