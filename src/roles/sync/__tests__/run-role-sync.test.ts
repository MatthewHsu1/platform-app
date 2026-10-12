import { describe, expect, it } from 'vitest';

import { CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS, CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER as LEAD, CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER as STAGE } from 'src/crm/crm-universal-identifiers.constant';
import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { SALES_OWN_BLOCK } from 'src/roles/blocks/sales.blocks';
import { makeFakeRoleSyncApi } from 'src/roles/sync/__tests__/fakes/fake-role-sync-api';
import { runRoleSync } from 'src/roles/sync/run-role-sync';
import { closeBlocks } from 'src/roles/utils/close-blocks.util';
import { mixedRoleId } from 'src/roles/utils/mixed-role-id.util';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER as WAREHOUSE } from 'src/stock/stock-universal-identifiers.constant';

const COMPANY = '20202020-b374-4779-a561-80086cb2e17f';
// Company is Twenty's own; leads, stages and warehouses are Platform's. No Sales block opens warehouses.
const WORKSPACE = {
  objectIdByUniversalIdentifier: { [LEAD]: 'object-lead', [STAGE]: 'object-stage', [COMPANY]: 'object-company', [WAREHOUSE]: 'object-warehouse' },
  platformObjectUniversalIdentifiers: [LEAD, STAGE, WAREHOUSE],
};
const NONE = { canReadObjectRecords: false, canUpdateObjectRecords: false, canSoftDeleteObjectRecords: false, canDestroyObjectRecords: false };
const ALL = { canReadObjectRecords: true, canUpdateObjectRecords: true, canSoftDeleteObjectRecords: true, canDestroyObjectRecords: true };
const READ = { ...NONE, canReadObjectRecords: true };
const READ_WRITE = { ...READ, canUpdateObjectRecords: true };

const OWN_KEYS = closeBlocks([BLOCK_KEYS.salesOwn], BUILDING_BLOCKS);
const ALL_KEYS = closeBlocks([BLOCK_KEYS.salesAll], BUILDING_BLOCKS);
const OWN_ID = mixedRoleId('ws-1', OWN_KEYS);
const ALL_ID = mixedRoleId('ws-1', ALL_KEYS);

const IGNORED = (roleId: string) =>
  `Roles: the mix table entry for role ${roleId} does not match its building blocks or names a block this version does not have, and was ignored.`;
const save = (workspaceMemberId: string, blockKeys: string[]) => ({ kind: 'save' as const, workspaceMemberId, blockKeys });
const holderOf = (state: { roles: { id: string; memberIds: string[] }[] }, memberId: string) => state.roles.find((role) => role.memberIds.includes(memberId))?.id;

describe('runRoleSync', () => {
  it('a save makes the mixed role, gives it the rights of its blocks, gives it to the person, and writes the row rules and the table', async () => {
    const fake = makeFakeRoleSyncApi(WORKSPACE);

    const result = await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.employee, BLOCK_KEYS.salesOwn]) });

    expect(result.created).toEqual([OWN_ID]);
    expect(result.assignedRoleId).toBe(OWN_ID);
    expect(holderOf(fake.state, 'member-repa')).toBe(OWN_ID);
    const role = fake.findRole(OWN_ID);
    expect(role.label).toBe('Employee + Sales: Own Documents');
    expect(role.canReadAllObjectRecords).toBe(true);
    expect(role.objectPermissions).toEqual([
      { objectMetadataId: 'object-lead', ...READ_WRITE },
      { objectMetadataId: 'object-stage', ...READ },
      { objectMetadataId: 'object-warehouse', ...NONE },
    ]);
    expect(JSON.parse(fake.state.rowAccess ?? 'null')).toEqual({
      version: 2,
      objects: [{ objectUniversalIdentifier: LEAD, ownerFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.salesperson }],
      roles: [{ roleId: OWN_ID, rules: [{ objectUniversalIdentifier: LEAD, scope: 'mineOrUnowned' }] }],
    });
    expect(fake.state.mixTable).toEqual({ version: 1, roles: { [OWN_ID]: OWN_KEYS } });
  });

  it('a second run writes nothing', async () => {
    const fake = makeFakeRoleSyncApi(WORKSPACE);
    await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) });
    fake.calls.length = 0;

    await runRoleSync({ api: fake.api, request: { kind: 'rebuild' } });
    await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) });

    expect(fake.calls).toEqual([]);
  });

  it('two people with the same mix share one role', async () => {
    const fake = makeFakeRoleSyncApi(WORKSPACE);
    await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) });

    const result = await runRoleSync({ api: fake.api, request: save('member-repb', [BLOCK_KEYS.salesOwn]) });

    expect(result.created).toEqual([]);
    expect(fake.findRole(OWN_ID).memberIds).toEqual(['member-repa', 'member-repb']);
  });

  it('deletes a mix nobody holds any more and drops it from the row rules and the table', async () => {
    const fake = makeFakeRoleSyncApi(WORKSPACE);
    await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) });

    const result = await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesAll]) });

    expect(result.deleted).toEqual([OWN_ID]);
    expect(fake.state.roles.map((role) => role.id)).toEqual(['role-admin', 'role-member', ALL_ID]);
    expect(JSON.parse(fake.state.rowAccess ?? 'null').roles).toEqual([{ roleId: ALL_ID, rules: [{ objectUniversalIdentifier: LEAD, scope: 'all' }] }]);
    expect(fake.state.mixTable).toEqual({ version: 1, roles: { [ALL_ID]: ALL_KEYS } });
  });

  it('None everywhere puts the person back on the default role and deletes the mix they left', async () => {
    const fake = makeFakeRoleSyncApi(WORKSPACE);
    await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) });

    const result = await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.employee]) });

    expect(result.assignedRoleId).toBe('role-member');
    expect(holderOf(fake.state, 'member-repa')).toBe('role-member');
    expect(result.deleted).toEqual([OWN_ID]);
  });

  it('rebuilds a mixed role when its blocks change', async () => {
    const fake = makeFakeRoleSyncApi(WORKSPACE);
    await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) });
    const narrower = BUILDING_BLOCKS.map((block) =>
      block.key === BLOCK_KEYS.salesOwn
        ? { ...SALES_OWN_BLOCK, objectRights: SALES_OWN_BLOCK.objectRights.map((entry) => (entry.objectUniversalIdentifier === LEAD ? { ...entry, rights: 'R' as const } : entry)) }
        : block,
    );

    const result = await runRoleSync({ api: fake.api, request: { kind: 'rebuild' }, blocks: narrower });

    expect(result.updated).toEqual([OWN_ID]);
    expect(fake.findRole(OWN_ID).objectPermissions).toContainEqual({ objectMetadataId: 'object-lead', ...READ });
  });

  it('puts back rights an admin changed by hand, closing again a Platform object they opened', async () => {
    const fake = makeFakeRoleSyncApi(WORKSPACE);
    await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) });
    fake.findRole(OWN_ID).objectPermissions = [{ objectMetadataId: 'object-lead', ...ALL }];

    await runRoleSync({ api: fake.api, request: { kind: 'rebuild' } });

    expect(fake.findRole(OWN_ID).objectPermissions).toEqual([
      { objectMetadataId: 'object-lead', ...READ_WRITE },
      { objectMetadataId: 'object-stage', ...READ },
      { objectMetadataId: 'object-warehouse', ...NONE },
    ]);
  });

  it('ignores a mix table entry whose id does not match its blocks', async () => {
    const fake = makeFakeRoleSyncApi(WORKSPACE);
    await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) });
    fake.state.mixTable = { version: 1, roles: { [OWN_ID]: closeBlocks([BLOCK_KEYS.salesAdministrator], BUILDING_BLOCKS) } };
    fake.calls.length = 0;

    const result = await runRoleSync({ api: fake.api, request: { kind: 'rebuild' } });

    expect(result.warnings).toEqual([IGNORED(OWN_ID)]);
    expect(fake.calls).toEqual(['writeRowAccessConfig', 'writeMixTable']);
    expect(fake.findRole(OWN_ID).objectPermissions).toContainEqual({ objectMetadataId: 'object-lead', ...READ_WRITE });
  });

  it("writes only to roles Platform made: a mix table entry naming Twenty's Member role is ignored and Member keeps its rights", async () => {
    const fake = makeFakeRoleSyncApi({ ...WORKSPACE, mixTable: { version: 1, roles: { 'role-member': OWN_KEYS } } });
    const memberBefore = structuredClone(fake.findRole('role-member'));

    const result = await runRoleSync({ api: fake.api, request: { kind: 'rebuild' } });

    expect(result.warnings).toEqual([IGNORED('role-member')]);
    expect(fake.calls).toEqual(['writeRowAccessConfig', 'writeMixTable']);
    expect(fake.findRole('role-member')).toEqual(memberBefore);
  });

  it('a refused assignment leaves no unused mixed role', async () => {
    const fake = makeFakeRoleSyncApi({ ...WORKSPACE, refuseAssignment: true });

    await expect(runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) })).rejects.toThrow('Cannot update self role');

    expect(fake.state.roles.map((role) => role.id)).toEqual(['role-admin', 'role-member']);
    expect(holderOf(fake.state, 'member-repa')).toBe('role-member');
  });

  it('leaves alone a mix table entry naming a block this version does not have, and reports it', async () => {
    const oldKeys = ['employee', 'old.block', 'sales.own'];
    const oldId = mixedRoleId('ws-1', oldKeys);
    const fake = makeFakeRoleSyncApi({ ...WORKSPACE, mixTable: { version: 1, roles: { [oldId]: oldKeys } } });
    fake.state.roles.push({ ...fake.findRole('role-member'), id: oldId, label: 'Old mix', memberIds: ['member-repa'] });
    fake.findRole('role-member').memberIds = ['member-repb'];
    const before = structuredClone(fake.findRole(oldId));

    const result = await runRoleSync({ api: fake.api, request: { kind: 'rebuild' } });

    expect(result.warnings).toEqual([IGNORED(oldId)]);
    expect(fake.calls).toEqual(['writeRowAccessConfig', 'writeMixTable']);
    expect(fake.findRole(oldId)).toEqual(before);
  });

  it('a mixed role made the workspace default role is neither rebuilt nor deleted, and is reported', async () => {
    const fake = makeFakeRoleSyncApi(WORKSPACE);
    await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) });
    fake.state.defaultRoleId = OWN_ID;
    fake.findRole(OWN_ID).objectPermissions = [{ objectMetadataId: 'object-lead', ...ALL }];
    fake.calls.length = 0;

    const result = await runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesAll]) });

    expect(result.warnings).toEqual([
      'Roles: the default role "Employee + Sales: Own Documents" is a mixed role, so Platform leaves it as it is; change the default role in Settings.',
    ]);
    expect(result.deleted).toEqual([]);
    expect(fake.calls).toEqual(['createRole Employee + Sales: All Documents', `objects ${ALL_ID}`, `assignRole member-repa ${ALL_ID}`, 'writeRowAccessConfig', 'writeMixTable']);
    expect(fake.findRole(OWN_ID).objectPermissions).toEqual([{ objectMetadataId: 'object-lead', ...ALL }]);
    expect(fake.state.mixTable).toEqual({ version: 1, roles: { [ALL_ID]: ALL_KEYS, [OWN_ID]: OWN_KEYS } });
  });

  it('a role whose rights Twenty refuses is reported, and the other roles, the row rules and the table are still written', async () => {
    const fake = makeFakeRoleSyncApi({ ...WORKSPACE, refuseWritesTo: [OWN_ID] });
    fake.state.roles.push({ ...fake.findRole('role-member'), id: OWN_ID, label: 'Own by hand', memberIds: ['member-repa'] });
    fake.state.roles.push({ ...fake.findRole('role-member'), id: ALL_ID, label: 'All by hand', memberIds: ['member-repb'] });
    fake.findRole('role-member').memberIds = [];
    fake.state.mixTable = { version: 1, roles: { [OWN_ID]: OWN_KEYS, [ALL_ID]: ALL_KEYS } };

    const result = await runRoleSync({ api: fake.api, request: { kind: 'rebuild' } });

    expect(result.failed).toEqual([{ roleId: OWN_ID, message: 'A role with this label already exists' }]);
    expect(result.warnings).toEqual(['Roles: role "Own by hand" could not be brought in line with its building blocks: A role with this label already exists']);
    expect(result.updated).toEqual([ALL_ID]);
    expect(fake.findRole(ALL_ID).label).toBe('Employee + Sales: All Documents');
    expect(JSON.parse(fake.state.rowAccess ?? 'null').roles).toEqual([{ roleId: ALL_ID, rules: [{ objectUniversalIdentifier: LEAD, scope: 'all' }] }]);
    expect(fake.state.mixTable).toEqual({ version: 1, roles: { [ALL_ID]: ALL_KEYS, [OWN_ID]: OWN_KEYS } });
  });

  it('a save whose new role Twenty refuses to set up gives nobody that role and removes it', async () => {
    const fake = makeFakeRoleSyncApi({ ...WORKSPACE, refuseWritesTo: [OWN_ID] });

    await expect(runRoleSync({ api: fake.api, request: save('member-repa', [BLOCK_KEYS.salesOwn]) })).rejects.toThrow('A role with this label already exists');

    expect(fake.state.roles.map((role) => role.id)).toEqual(['role-admin', 'role-member']);
    expect(holderOf(fake.state, 'member-repa')).toBe('role-member');
    expect(fake.state.mixTable).toEqual({ version: 1, roles: {} });
  });
});
