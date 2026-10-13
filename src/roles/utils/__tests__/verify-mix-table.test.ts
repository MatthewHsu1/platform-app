import { describe, expect, it } from 'vitest';

import { mixedRoleId } from 'src/roles/utils/mixed-role-id.util';
import { canonicalMixTable, isSameMixTable, verifyMixTable } from 'src/roles/utils/verify-mix-table.util';

const KEYS = ['employee', 'sales.own'];
const ROLE_ID = mixedRoleId('ws-1', KEYS);

describe('verifyMixTable', () => {
  it('keeps an entry whose id is the one derived from the workspace and its blocks', () => {
    expect(verifyMixTable({ raw: { version: 1, roles: { [ROLE_ID]: ['sales.own', 'employee'] } }, workspaceId: 'ws-1' })).toEqual({
      table: { version: 1, roles: { [ROLE_ID]: KEYS } },
      ignoredRoleIds: [],
    });
  });

  it('ignores an entry whose blocks were changed, one from another workspace, and anything that is not a list of keys', () => {
    expect(
      verifyMixTable({
        raw: { version: 1, roles: { [ROLE_ID]: ['employee', 'sales.administrator'], [mixedRoleId('ws-2', KEYS)]: KEYS, other: 'sales.own' } },
        workspaceId: 'ws-1',
      }),
    ).toEqual({ table: { version: 1, roles: {} }, ignoredRoleIds: [ROLE_ID, mixedRoleId('ws-2', KEYS), 'other'] });
  });

  it("ignores an entry that names one of Twenty's own roles", () => {
    expect(verifyMixTable({ raw: { version: 1, roles: { 'role-member': KEYS } }, workspaceId: 'ws-1' })).toEqual({
      table: { version: 1, roles: {} },
      ignoredRoleIds: ['role-member'],
    });
  });

  it('ignores an entry whose keys were joined so that they derive the same id as real blocks', () => {
    expect(verifyMixTable({ raw: { version: 1, roles: { [ROLE_ID]: ['employee:sales.own'] } }, workspaceId: 'ws-1' })).toEqual({
      table: { version: 1, roles: {} },
      ignoredRoleIds: [ROLE_ID],
    });
  });

  it('ignores an entry naming a block this version does not have', () => {
    const oldKeys = ['employee', 'old.block', 'sales.own'];

    expect(verifyMixTable({ raw: { version: 1, roles: { [mixedRoleId('ws-1', oldKeys)]: oldKeys } }, workspaceId: 'ws-1' })).toEqual({
      table: { version: 1, roles: {} },
      ignoredRoleIds: [mixedRoleId('ws-1', oldKeys)],
    });
  });

  it('reads nothing stored as an empty table', () => {
    expect(verifyMixTable({ raw: null, workspaceId: 'ws-1' })).toEqual({ table: { version: 1, roles: {} }, ignoredRoleIds: [] });
  });
});

describe('canonicalMixTable', () => {
  it('orders the roles by id so an unchanged table serialises the same', () => {
    expect(JSON.stringify(canonicalMixTable({ version: 1, roles: { b: ['x'], a: ['y'] } }))).toBe('{"version":1,"roles":{"a":["y"],"b":["x"]}}');
  });
});

describe('isSameMixTable', () => {
  const TABLE = { version: 1 as const, roles: { [ROLE_ID]: KEYS, [mixedRoleId('ws-1', ['employee', 'sales.all', 'sales.own'])]: ['employee', 'sales.all', 'sales.own'] } };

  it('reads a stored table whose keys come back in another order as the same table', () => {
    const stored = { roles: Object.fromEntries(Object.entries(TABLE.roles).reverse().map(([roleId, keys]) => [roleId, [...keys].reverse()])), version: 1 };

    expect(isSameMixTable(stored, TABLE)).toBe(true);
  });

  it('reads a stored table with another entry, other keys or another version as a different table', () => {
    expect(isSameMixTable({ version: 1, roles: { ...TABLE.roles, other: KEYS } }, TABLE)).toBe(false);
    expect(isSameMixTable({ version: 1, roles: { ...TABLE.roles, [ROLE_ID]: ['employee'] } }, TABLE)).toBe(false);
    expect(isSameMixTable({ version: 2, roles: TABLE.roles }, TABLE)).toBe(false);
    expect(isSameMixTable(null, TABLE)).toBe(false);
  });
});
