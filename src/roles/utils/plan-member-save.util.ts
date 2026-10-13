import { ROLES_MESSAGES } from 'src/roles/roles-messages.constant';
import { type CallerAccess } from 'src/roles/types/caller-access.type';
import { type MemberSavePlan } from 'src/roles/types/member-save-plan.type';
import { type RoleModule } from 'src/roles/types/role-module.type';
import { type RolesPageRow } from 'src/roles/types/roles-page-row.type';
import { levelsToBlockKeys } from 'src/roles/utils/member-levels.util';
import { mayManageRoles } from 'src/roles/utils/may-manage-roles.util';

const isLevels = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every((level) => typeof level === 'string');

// A page that is out of date can send a module or level this version no longer has; that must not
// quietly save as None.
const offersEveryLevel = (levels: Record<string, string>, modules: RoleModule[]) =>
  Object.entries(levels).every(([moduleKey, levelKey]) => modules.find((module) => module.key === moduleKey)?.levels.some((level) => level.key === levelKey) === true);

// Every refusal is decided here, before the sync writes anything.
export const planMemberSave = ({
  body,
  access,
  rows,
  modules,
}: {
  body: unknown;
  access: CallerAccess;
  rows: RolesPageRow[];
  modules: RoleModule[];
}): MemberSavePlan => {
  if (!mayManageRoles(access)) {
    return { kind: 'refuse', status: 403, message: ROLES_MESSAGES.notAdmin };
  }
  const input = (typeof body === 'object' && body !== null ? body : {}) as { workspaceMemberId?: unknown; levels?: unknown };

  if (typeof input.workspaceMemberId !== 'string' || input.workspaceMemberId === '' || !isLevels(input.levels) || !offersEveryLevel(input.levels, modules)) {
    return { kind: 'refuse', status: 400, message: ROLES_MESSAGES.badRequest };
  }
  const row = rows.find((candidate) => candidate.workspaceMemberId === input.workspaceMemberId);

  if (row === undefined) {
    return { kind: 'refuse', status: 404, message: ROLES_MESSAGES.unknownMember };
  }
  if (row.isSelf || row.workspaceMemberId === access.workspaceMemberId) {
    return { kind: 'refuse', status: 409, message: ROLES_MESSAGES.ownRow };
  }
  if (row.isAdmin) {
    return { kind: 'refuse', status: 409, message: ROLES_MESSAGES.adminRow };
  }

  return { kind: 'save', workspaceMemberId: row.workspaceMemberId, name: row.name || row.email, blockKeys: levelsToBlockKeys(input.levels, modules) };
};
