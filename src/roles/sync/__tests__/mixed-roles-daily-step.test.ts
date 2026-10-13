import { describe, expect, it } from 'vitest';

import { makeMixedRolesStep } from 'src/roles/sync/mixed-roles-daily-step';

describe('the daily mixed roles step', () => {
  it('succeeds and hands the warnings back as notes when no role failed', async () => {
    const step = makeMixedRolesStep(async () => ({ warnings: ['Roles: the default role "Member" is a mixed role'], failed: [] }));

    expect(await step()).toEqual(['Roles: the default role "Member" is a mixed role']);
  });

  it('fails, naming each role Twenty refused, when a role failed', async () => {
    const step = makeMixedRolesStep(async () => ({
      warnings: ['Roles: rebuild failed: no'],
      failed: [{ roleId: 'role-1', message: 'no' }, { roleId: 'role-2', message: 'not allowed' }],
    }));

    await expect(step()).rejects.toThrow('role-1: no / role-2: not allowed');
  });
});
