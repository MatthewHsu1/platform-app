import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { RolesUserError } from 'src/roles/page/roles-route';
import { ROLE_MODULES } from 'src/roles/role-modules';
import { ROLES_MESSAGES } from 'src/roles/roles-messages.constant';
import { type CallerAccess } from 'src/roles/types/caller-access.type';
import { type RoleSyncRequest } from 'src/roles/types/role-sync-request.type';
import { type RoleSyncResult } from 'src/roles/types/role-sync-result.type';
import { type RolesPageWithDefaultRole } from 'src/roles/types/roles-page-with-default-role.type';
import { closeBlocks } from 'src/roles/utils/close-blocks.util';
import { mayManageRoles } from 'src/roles/utils/may-manage-roles.util';
import { mixedRoleLabel } from 'src/roles/utils/mixed-role-label.util';
import { planMemberSave } from 'src/roles/utils/plan-member-save.util';
import { translate } from 'src/shared/i18n/translate';

// The sync writes with the app's token, so nothing is read or written until the clicking user is
// known to be an Admin or to hold the Roles permission; a request with nobody signed in behind it
// (an API key) is refused the same way.
export const makeSaveMemberRoles =
  (deps: {
    readAccess: () => Promise<CallerAccess | null>;
    readPage: (access: CallerAccess) => Promise<RolesPageWithDefaultRole>;
    sync: (request: RoleSyncRequest) => Promise<RoleSyncResult>;
    readLocale: () => Promise<string>;
  }) =>
  async (body: Record<string, unknown>): Promise<{ message: string; warnings: string[] }> => {
    const access = await deps.readAccess();

    if (access === null || !mayManageRoles(access)) {
      throw new RolesUserError(403, ROLES_MESSAGES.notAdmin);
    }
    const page = await deps.readPage(access);
    const plan = planMemberSave({ body, access, rows: page.rows, modules: ROLE_MODULES });

    if (plan.kind === 'refuse') {
      throw new RolesUserError(plan.status, plan.message);
    }
    const result = await deps.sync({ kind: 'save', workspaceMemberId: plan.workspaceMemberId, blockKeys: plan.blockKeys });
    const closedKeys = closeBlocks(plan.blockKeys, BUILDING_BLOCKS);
    const role = closedKeys.every((key) => key === BLOCK_KEYS.employee) ? page.defaultRoleLabel : mixedRoleLabel(closedKeys, BUILDING_BLOCKS, ROLE_MODULES);

    return { message: translate(await deps.readLocale(), ROLES_MESSAGES.saved, { name: plan.name, role }), warnings: result.warnings };
  };
