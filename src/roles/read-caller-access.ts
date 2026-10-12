import { kv } from 'twenty-sdk/logic-function';

import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { ADMIN_ROLE_UNIVERSAL_IDENTIFIER } from 'src/roles/constants/admin-role-universal-identifier.constant';
import { MIX_TABLE_KEY } from 'src/roles/constants/mix-table-key.constant';
import { type CallerAccess } from 'src/roles/types/caller-access.type';
import { verifyMixTable } from 'src/roles/utils/verify-mix-table.util';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';
import { hasPersonToken } from 'src/shared/utils/has-person-token.util';

// Who clicked, and which building blocks their role was made from. Admin counts as holding every
// block; a role Platform did not make (Twenty's Member, one made by hand) as holding none. The
// signed-in user is read with their own token; the role list with the app token, which holds the
// Roles flag a member does not.
export const readCallerAccess = async (): Promise<CallerAccess> => {
  // A schedule or an install hook has nobody behind it: no access, rather than an error.
  if (!hasPersonToken()) {
    return { workspaceMemberId: null, isWorkspaceAdmin: false, blockKeys: [], canManageRoles: false };
  }

  const me = requireData(
    await twentyMetadata<{ currentUser: { currentUserWorkspace: { permissionFlags: string[] | null } | null; workspaceMember: { id: string } | null } | null }>(
      'person',
      '{ currentUser { currentUserWorkspace { permissionFlags } workspaceMember { id } } }',
    ),
    'Read the signed-in user',
  );
  const workspaceMemberId = me.currentUser?.workspaceMember?.id ?? null;
  const canManageRoles = (me.currentUser?.currentUserWorkspace?.permissionFlags ?? []).includes('ROLES');

  if (workspaceMemberId === null) {
    return { workspaceMemberId, isWorkspaceAdmin: false, blockKeys: [], canManageRoles };
  }

  const data = requireData(
    await twentyMetadata<{ currentWorkspace: { id: string }; getRoles: { id: string; universalIdentifier: string | null; workspaceMembers: { id: string }[] | null }[] }>(
      'application',
      '{ currentWorkspace { id } getRoles { id universalIdentifier workspaceMembers { id } } }',
    ),
    'List roles',
  );
  const role = data.getRoles.find((candidate) => (candidate.workspaceMembers ?? []).some((member) => member.id === workspaceMemberId));

  if (role?.universalIdentifier === ADMIN_ROLE_UNIVERSAL_IDENTIFIER) {
    return { workspaceMemberId, isWorkspaceAdmin: true, blockKeys: BUILDING_BLOCKS.map((block) => block.key), canManageRoles };
  }

  const { table } = verifyMixTable({ raw: await kv.get<unknown>(MIX_TABLE_KEY), workspaceId: data.currentWorkspace.id });

  return { workspaceMemberId, isWorkspaceAdmin: false, blockKeys: role === undefined ? [] : (table.roles[role.id] ?? []), canManageRoles };
};
