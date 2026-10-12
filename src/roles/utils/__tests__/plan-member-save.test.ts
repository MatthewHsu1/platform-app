import { describe, expect, it } from 'vitest';

import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { ROLE_MODULES } from 'src/roles/role-modules';
import { ROLES_MESSAGES } from 'src/roles/roles-messages.constant';
import { type CallerAccess } from 'src/roles/types/caller-access.type';
import { type RolesPageRow } from 'src/roles/types/roles-page-row.type';
import { planMemberSave } from 'src/roles/utils/plan-member-save.util';

const ADMIN: CallerAccess = { workspaceMemberId: 'm-admin', isWorkspaceAdmin: true, blockKeys: [], canManageRoles: true };
const row = (workspaceMemberId: string, overrides: Partial<RolesPageRow> = {}): RolesPageRow => ({
  workspaceMemberId,
  name: workspaceMemberId,
  email: `${workspaceMemberId}@choice.dev`,
  roleLabel: 'Member',
  isAdmin: false,
  isSelf: false,
  levels: null,
  ...overrides,
});
const ROWS = [row('m-admin', { isAdmin: true, isSelf: true }), row('m-other-admin', { isAdmin: true }), row('m-rep')];
const plan = (body: unknown, access: CallerAccess = ADMIN) => planMemberSave({ body, access, rows: ROWS, modules: ROLE_MODULES });

describe('planMemberSave', () => {
  it('turns the chosen levels into blocks', () => {
    expect(plan({ workspaceMemberId: 'm-rep', levels: { inventory: 'user', sales: 'own' } })).toEqual({
      kind: 'save',
      workspaceMemberId: 'm-rep',
      name: 'm-rep',
      blockKeys: [BLOCK_KEYS.employee, BLOCK_KEYS.inventoryUser, BLOCK_KEYS.salesOwn],
    });
  });

  it('refuses a caller who is neither Admin nor holds the Roles permission', () => {
    const nobody: CallerAccess = { workspaceMemberId: 'm-x', isWorkspaceAdmin: false, blockKeys: [BLOCK_KEYS.salesAdministrator], canManageRoles: false };

    expect(plan({ workspaceMemberId: 'm-rep', levels: {} }, nobody)).toEqual({ kind: 'refuse', status: 403, message: ROLES_MESSAGES.notAdmin });
  });

  it('accepts a caller who holds the Roles permission without being Admin, and an Admin without the permission flag', () => {
    const flagOnly: CallerAccess = { workspaceMemberId: 'm-x', isWorkspaceAdmin: false, blockKeys: [], canManageRoles: true };
    const adminOnly: CallerAccess = { ...ADMIN, canManageRoles: false };

    expect(plan({ workspaceMemberId: 'm-rep', levels: {} }, flagOnly).kind).toBe('save');
    expect(plan({ workspaceMemberId: 'm-rep', levels: {} }, adminOnly).kind).toBe('save');
  });

  it("refuses the caller's own row: Twenty lets nobody change their own role", () => {
    expect(plan({ workspaceMemberId: 'm-admin', levels: {} })).toEqual({ kind: 'refuse', status: 409, message: ROLES_MESSAGES.ownRow });
  });

  it("refuses an Admin's row: Admin is never part of a mix", () => {
    expect(plan({ workspaceMemberId: 'm-other-admin', levels: {} })).toEqual({ kind: 'refuse', status: 409, message: ROLES_MESSAGES.adminRow });
  });

  it('refuses a person who is not a member, and a body without a person or levels', () => {
    expect(plan({ workspaceMemberId: 'm-gone', levels: {} })).toEqual({ kind: 'refuse', status: 404, message: ROLES_MESSAGES.unknownMember });
    expect(plan({ levels: {} })).toEqual({ kind: 'refuse', status: 400, message: ROLES_MESSAGES.badRequest });
    expect(plan({ workspaceMemberId: 'm-rep', levels: 'sales' })).toEqual({ kind: 'refuse', status: 400, message: ROLES_MESSAGES.badRequest });
  });

  it('refuses a level or module the page does not offer, instead of quietly treating it as None', () => {
    expect(plan({ workspaceMemberId: 'm-rep', levels: { sales: 'boss' } })).toEqual({ kind: 'refuse', status: 400, message: ROLES_MESSAGES.badRequest });
    expect(plan({ workspaceMemberId: 'm-rep', levels: { purchasing: 'none' } })).toEqual({ kind: 'refuse', status: 400, message: ROLES_MESSAGES.badRequest });
  });
});
