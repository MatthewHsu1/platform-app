import { describe, expect, it, vi } from 'vitest';

import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { NoPersonBehindRequestError } from 'src/roles/no-person-behind-request.error';
import { makeLoadRolesPage } from 'src/roles/page/load-roles-page';
import { makeSaveMemberRoles } from 'src/roles/page/save-member-roles';
import { RolesUserError } from 'src/roles/page/roles-route';
import { type CallerAccess } from 'src/roles/types/caller-access.type';
import { type RoleSyncResult } from 'src/roles/types/role-sync-result.type';
import { type RolesPageRow } from 'src/roles/types/roles-page-row.type';

const ADMIN: CallerAccess = { workspaceMemberId: 'm-admin', isWorkspaceAdmin: true, blockKeys: [], canManageRoles: true };
const MEMBER: CallerAccess = { workspaceMemberId: 'm-rep', isWorkspaceAdmin: false, blockKeys: [BLOCK_KEYS.salesAdministrator], canManageRoles: false };
const row = (workspaceMemberId: string, overrides: Partial<RolesPageRow> = {}): RolesPageRow => ({
  workspaceMemberId,
  name: workspaceMemberId,
  email: `${workspaceMemberId}@choice.dev`,
  roleLabel: 'Member',
  isAdmin: false,
  isSelf: workspaceMemberId === 'm-admin',
  levels: null,
  ...overrides,
});
const RESULT: RoleSyncResult = { created: [], updated: [], assignedRoleId: 'r', deleted: [], failed: [], rowAccessWritten: true, warnings: ['careful'] };

const setup = (readAccess: () => Promise<CallerAccess>) => {
  const readPage = vi.fn(async () => ({ rows: [row('m-admin', { isAdmin: true }), row('m-boss', { isAdmin: true }), row('m-rep')], modules: [], defaultRoleLabel: 'Member' }));
  const sync = vi.fn(async () => RESULT);
  const save = makeSaveMemberRoles({ readAccess, readPage, sync, readLocale: async () => 'en' });

  return { readPage, sync, save };
};

describe('saving one person from the Roles page', () => {
  it('syncs the chosen blocks and answers with the saved sentence and the warnings', async () => {
    const { save, sync } = setup(async () => ADMIN);

    expect(await save({ workspaceMemberId: 'm-rep', levels: { sales: 'all' } })).toEqual({
      message: 'Saved. m-rep now holds Employee + Sales: All Documents.',
      warnings: ['careful'],
    });
    expect(sync).toHaveBeenCalledWith({ kind: 'save', workspaceMemberId: 'm-rep', blockKeys: [BLOCK_KEYS.employee, BLOCK_KEYS.salesAll] });
  });

  it("names the workspace's default role when every level is None", async () => {
    const { save } = setup(async () => ADMIN);

    expect((await save({ workspaceMemberId: 'm-rep', levels: {} })).message).toBe('Saved. m-rep now holds Member.');
  });

  it('refuses a request with no person behind it (API key) with 403 before reading or writing anything', async () => {
    const { save, readPage, sync } = setup(async () => {
      throw new NoPersonBehindRequestError();
    });

    await expect(save({ workspaceMemberId: 'm-rep', levels: {} })).rejects.toBeInstanceOf(NoPersonBehindRequestError);
    expect(readPage).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it('refuses a member who is neither Admin nor holds the Roles permission, even one holding Sales: Administrator, before reading or writing', async () => {
    const { save, readPage, sync } = setup(async () => MEMBER);

    await expect(save({ workspaceMemberId: 'm-rep', levels: {} })).rejects.toMatchObject({ status: 403, message: 'Only an admin can change roles.' });
    expect(readPage).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it('refuses the own row, an Admin row and an unknown person without writing', async () => {
    const { save, sync } = setup(async () => ADMIN);

    await expect(save({ workspaceMemberId: 'm-admin', levels: {} })).rejects.toMatchObject({ status: 409, message: 'You cannot change your own role. Another admin must do it.' });
    await expect(save({ workspaceMemberId: 'm-boss', levels: {} })).rejects.toMatchObject({ status: 409 });
    await expect(save({ workspaceMemberId: 'm-gone', levels: {} })).rejects.toMatchObject({ status: 404 });
    await expect(save({ levels: {} })).rejects.toBeInstanceOf(RolesUserError);
    expect(sync).not.toHaveBeenCalled();
  });

  it('lets an outage reading the caller pass through as an ordinary error, not a refusal', async () => {
    const { save, sync } = setup(async () => {
      throw new Error('List roles: connection refused');
    });

    await expect(save({ workspaceMemberId: 'm-rep', levels: {} })).rejects.toThrow('List roles: connection refused');
    expect(sync).not.toHaveBeenCalled();
  });
});

describe('opening the Roles page', () => {
  it('refuses a caller who may not manage roles before reading the members', async () => {
    const readPage = vi.fn();
    const load = makeLoadRolesPage({ readAccess: async () => MEMBER, readPage });

    await expect(load()).rejects.toMatchObject({ status: 403 });
    expect(readPage).not.toHaveBeenCalled();
  });

  it('gives an Admin the rows and the drop-downs', async () => {
    const load = makeLoadRolesPage({ readAccess: async () => ADMIN, readPage: async () => ({ rows: [row('m-rep')], modules: [], defaultRoleLabel: 'Member' }) });

    expect(await load()).toEqual({ rows: [row('m-rep')], modules: [] });
  });
});
