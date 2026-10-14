import { describe, expect, it } from 'vitest';

import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { ROLE_MODULES } from 'src/roles/role-modules';
import { type RoleSyncSnapshot } from 'src/roles/types/role-sync-snapshot.type';
import { type SnapshotRole } from 'src/roles/types/snapshot-role.type';
import { closeBlocks } from 'src/roles/utils/close-blocks.util';
import { planRolesPageRows } from 'src/roles/utils/plan-roles-page-rows.util';

const role = (id: string, label: string, memberIds: string[], universalIdentifier: string | null = null) =>
  ({ id, label, universalIdentifier, memberIds }) as unknown as SnapshotRole;

const SNAPSHOT = {
  workspaceId: 'ws-1',
  defaultRoleId: 'role-member',
  roles: [
    role('role-admin', 'Admin', ['m-admin'], '20202020-02c2-43f2-b94d-cab1f2b532eb'),
    role('role-member', 'Member', ['m-new']),
    role('role-mix', 'Employee + Sales: All Documents', ['m-rep']),
    role('role-hand', 'Manager', ['m-manager']),
  ],
  members: [
    { id: 'm-rep', name: 'Rep', email: 'rep@choice.dev' },
    { id: 'm-admin', name: 'Ada', email: 'admin@choice.dev' },
    { id: 'm-new', name: 'New', email: 'new@choice.dev' },
    { id: 'm-manager', name: 'Max', email: 'max@choice.dev' },
  ],
} as unknown as RoleSyncSnapshot;

const TABLE = { version: 1 as const, roles: { 'role-mix': closeBlocks([BLOCK_KEYS.salesAll], BUILDING_BLOCKS) } };
const NONE = { inventory: 'none', products: 'none', sales: 'none', workCases: 'none', fieldService: 'none' };

describe('planRolesPageRows', () => {
  it('shows each person, sorted by name, with their real role and the levels it was made from', () => {
    expect(planRolesPageRows({ snapshot: SNAPSHOT, table: TABLE, callerMemberId: 'm-admin', modules: ROLE_MODULES })).toEqual([
      { workspaceMemberId: 'm-admin', name: 'Ada', email: 'admin@choice.dev', roleLabel: 'Admin', isAdmin: true, isSelf: true, levels: null },
      { workspaceMemberId: 'm-manager', name: 'Max', email: 'max@choice.dev', roleLabel: 'Manager', isAdmin: false, isSelf: false, levels: null },
      { workspaceMemberId: 'm-new', name: 'New', email: 'new@choice.dev', roleLabel: 'Member', isAdmin: false, isSelf: false, levels: NONE },
      { workspaceMemberId: 'm-rep', name: 'Rep', email: 'rep@choice.dev', roleLabel: 'Employee + Sales: All Documents', isAdmin: false, isSelf: false, levels: { ...NONE, sales: 'all' } },
    ]);
  });
});
