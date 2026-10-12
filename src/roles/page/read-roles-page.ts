import { ROLE_MODULES } from 'src/roles/role-modules';
import { twentyRoleSyncApi } from 'src/roles/sync/twenty-role-sync-api';
import { type CallerAccess } from 'src/roles/types/caller-access.type';
import { type RolesPageWithDefaultRole } from 'src/roles/types/roles-page-with-default-role.type';
import { planRolesPageRows } from 'src/roles/utils/plan-roles-page-rows.util';
import { verifyMixTable } from 'src/roles/utils/verify-mix-table.util';

export const readRolesPage = async (access: CallerAccess): Promise<RolesPageWithDefaultRole> => {
  const snapshot = await twentyRoleSyncApi.readSnapshot();
  const { table } = verifyMixTable({ raw: await twentyRoleSyncApi.readMixTable(), workspaceId: snapshot.workspaceId });

  return {
    rows: planRolesPageRows({ snapshot, table, callerMemberId: access.workspaceMemberId, modules: ROLE_MODULES }),
    modules: ROLE_MODULES.map((module) => ({ key: module.key, label: module.label, levels: module.levels.map((level) => ({ key: level.key, label: level.label })) })),
    defaultRoleLabel: snapshot.roles.find((role) => role.id === snapshot.defaultRoleId)?.label ?? '',
  };
};
