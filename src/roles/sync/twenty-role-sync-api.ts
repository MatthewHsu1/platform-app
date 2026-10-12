import { kv } from 'twenty-sdk/logic-function';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { MIX_TABLE_KEY } from 'src/roles/constants/mix-table-key.constant';
import { ROW_ACCESS_CONFIG_VARIABLE_KEY } from 'src/roles/constants/row-access-config-variable-key.constant';
import { type RoleSyncApi } from 'src/roles/types/role-sync-api.type';
import { type SnapshotRole } from 'src/roles/types/snapshot-role.type';
import { type GraphqlCaller, requireData, twentyGraphql, twentyMetadata } from 'src/shared/twenty-graphql';

// The token role writes go with: the app's own, which the server lets write roles.
export const ROLE_WRITE_CALLER: GraphqlCaller = 'application';

type RoleAnswer = Omit<SnapshotRole, 'memberIds' | 'permissionFlags' | 'objectPermissions' | 'fieldPermissions'> & {
  workspaceMembers: { id: string }[] | null;
  permissionFlags: { flag: string }[] | null;
  objectPermissions: SnapshotRole['objectPermissions'] | null;
  fieldPermissions: SnapshotRole['fieldPermissions'] | null;
};

type ObjectAnswer = { id: string; universalIdentifier: string; applicationId: string; fieldsList: { id: string; universalIdentifier: string }[] | null };

const SNAPSHOT_QUERY = `{
  currentWorkspace { id defaultRole { id } }
  getRoles {
    id label description universalIdentifier
    canUpdateAllSettings canAccessAllTools canReadAllObjectRecords canUpdateAllObjectRecords
    canSoftDeleteAllObjectRecords canDestroyAllObjectRecords
    canBeAssignedToUsers canBeAssignedToAgents canBeAssignedToApiKeys
    workspaceMembers { id }
    objectPermissions { objectMetadataId canReadObjectRecords canUpdateObjectRecords canSoftDeleteObjectRecords canDestroyObjectRecords }
    permissionFlags { flag }
    fieldPermissions { objectMetadataId fieldMetadataId canReadFieldValue canUpdateFieldValue }
  }
  objects(paging: { first: 1000 }) { edges { node { id universalIdentifier applicationId fieldsList { id universalIdentifier } } } }
}`;

const MEMBERS_QUERY = `{ workspaceMembers(first: 200) { edges { node { id userEmail name { firstName lastName } } } } }`;

const APPLICATION_QUERY = `{ findOneApplication(universalIdentifier: "${APPLICATION_UNIVERSAL_IDENTIFIER}") { id applicationVariables { key value } } }`;

// Twenty answers an error, not null, when the application is not found.
const readApplication = async () =>
  requireData(
    await twentyMetadata<{ findOneApplication: { id: string; applicationVariables: { key: string; value: string | null }[] | null } }>(
      'application',
      APPLICATION_QUERY,
    ),
    'Read Platform',
  ).findOneApplication;

// Reads with the app token alone; writes roles with it too. Only the assignment goes with the
// clicking person's token: Twenty needs an acting user to refuse a change of one's own role.
export const twentyRoleSyncApi: RoleSyncApi = {
  readSnapshot: async () => {
    const data = requireData(
      await twentyMetadata<{
        currentWorkspace: { id: string; defaultRole: { id: string } | null };
        getRoles: RoleAnswer[];
        objects: { edges: { node: ObjectAnswer }[] };
      }>('application', SNAPSHOT_QUERY),
      'Read roles',
    );
    const members = requireData(
      await twentyGraphql<{
        workspaceMembers: { edges: { node: { id: string; userEmail: string | null; name: { firstName: string | null; lastName: string | null } | null } }[] };
      }>('application', MEMBERS_QUERY),
      'Read members',
    ).workspaceMembers.edges.map(({ node }) => ({
      id: node.id,
      name: [node.name?.firstName, node.name?.lastName].filter((part) => part !== null && part !== undefined && part !== '').join(' '),
      email: node.userEmail ?? '',
    }));
    const objects = data.objects.edges.map(({ node }) => node);
    const application = await readApplication();
    const platformObjectUniversalIdentifiers = objects.filter((object) => object.applicationId === application.id).map((object) => object.universalIdentifier);

    if (data.currentWorkspace.defaultRole === null) {
      throw new Error('The workspace has no default role');
    }
    // Every mixed role holding Employee opens all records role-wide and closes Platform's objects one
    // by one: without that list it would open them all.
    if (platformObjectUniversalIdentifiers.length === 0) {
      throw new Error("Could not find Platform's objects in this workspace");
    }

    return {
      workspaceId: data.currentWorkspace.id,
      defaultRoleId: data.currentWorkspace.defaultRole.id,
      objectIdByUniversalIdentifier: Object.fromEntries(objects.map((object) => [object.universalIdentifier, object.id])),
      fieldIdByUniversalIdentifier: Object.fromEntries(objects.flatMap((object) => (object.fieldsList ?? []).map((field) => [field.universalIdentifier, field.id]))),
      platformObjectUniversalIdentifiers,
      roles: data.getRoles.map((role) => ({
        ...role,
        memberIds: (role.workspaceMembers ?? []).map((member) => member.id),
        permissionFlags: (role.permissionFlags ?? []).map((entry) => entry.flag),
        objectPermissions: role.objectPermissions ?? [],
        fieldPermissions: role.fieldPermissions ?? [],
      })),
      members,
    };
  },
  readMixTable: () => kv.get<unknown>(MIX_TABLE_KEY),
  writeMixTable: (table) => kv.set(MIX_TABLE_KEY, table),
  createRole: async ({ id, settings }) => {
    requireData(
      await twentyMetadata(ROLE_WRITE_CALLER, `mutation($input: CreateRoleInput!) { createOneRole(createRoleInput: $input) { id } }`, {
        input: { id, icon: 'IconUsersGroup', ...settings },
      }),
      `Make the role ${settings.label}`,
    );
  },
  applyWrite: async (write) => {
    if (write.kind === 'role') {
      requireData(
        await twentyMetadata(ROLE_WRITE_CALLER, `mutation($input: UpdateRoleInput!) { updateOneRole(updateRoleInput: $input) { id } }`, {
          input: { id: write.roleId, update: write.settings },
        }),
        'Update a mixed role',
      );
    } else if (write.kind === 'objects') {
      requireData(
        await twentyMetadata(
          ROLE_WRITE_CALLER,
          `mutation($input: UpsertObjectPermissionsInput!) { upsertObjectPermissions(upsertObjectPermissionsInput: $input) { objectMetadataId } }`,
          { input: { roleId: write.roleId, objectPermissions: write.objectPermissions } },
        ),
        'Set the object rights of a mixed role',
      );
    } else if (write.kind === 'flags') {
      requireData(
        await twentyMetadata(
          ROLE_WRITE_CALLER,
          `mutation($input: UpsertPermissionFlagsInput!) { upsertPermissionFlags(upsertPermissionFlagsInput: $input) { flag } }`,
          { input: { roleId: write.roleId, permissionFlagKeys: write.permissionFlagKeys } },
        ),
        'Set the settings flags of a mixed role',
      );
    } else {
      requireData(
        await twentyMetadata(
          ROLE_WRITE_CALLER,
          `mutation($input: UpsertFieldPermissionsInput!) { upsertFieldPermissions(upsertFieldPermissionsInput: $input) { fieldMetadataId } }`,
          { input: { roleId: write.roleId, fieldPermissions: write.fieldPermissions } },
        ),
        'Set the hidden fields of a mixed role',
      );
    }
  },
  assignRole: async (workspaceMemberId, roleId) => {
    requireData(
      await twentyMetadata(
        'person',
        `mutation($member: UUID!, $role: UUID!) { updateWorkspaceMemberRole(workspaceMemberId: $member, roleId: $role) { id } }`,
        { member: workspaceMemberId, role: roleId },
      ),
      'Give the person their role',
    );
  },
  deleteRole: async (roleId) => {
    requireData(await twentyMetadata(ROLE_WRITE_CALLER, `mutation($id: UUID!) { deleteOneRole(roleId: $id) }`, { id: roleId }), 'Delete an unused mixed role');
  },
  readRowAccessConfig: async () =>
    (await readApplication()).applicationVariables?.find((variable) => variable.key === ROW_ACCESS_CONFIG_VARIABLE_KEY)?.value ?? null,
  writeRowAccessConfig: async (value) => {
    const application = await readApplication();

    requireData(
      await twentyMetadata(
        'application',
        `mutation($key: String!, $value: String!, $applicationId: UUID!) { updateOneApplicationVariable(key: $key, value: $value, applicationId: $applicationId) }`,
        { key: ROW_ACCESS_CONFIG_VARIABLE_KEY, value, applicationId: application.id },
      ),
      'Write the row rules',
    );
  },
};
