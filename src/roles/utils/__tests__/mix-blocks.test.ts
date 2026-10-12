import { describe, expect, it } from 'vitest';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER as LEAD, CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER as STAGE } from 'src/crm/crm-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER as PRODUCT_TEMPLATE } from 'src/product/product-universal-identifiers.constant';
import { UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER as UTM_STAGE, UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER as UTM_TAG } from 'src/utm/utm-universal-identifiers.constant';
import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { INVENTORY_ROLE_TABLE } from 'src/roles/inventory-role-table';
import { ROLE_MODULES } from 'src/roles/role-modules';
import { SALES_ROLE_TABLE } from 'src/roles/sales-role-table';
import { type BuildingBlock } from 'src/roles/types/building-block.type';
import { closeBlocks } from 'src/roles/utils/close-blocks.util';
import { mixBlocks } from 'src/roles/utils/mix-blocks.util';
import { mixedRoleId } from 'src/roles/utils/mixed-role-id.util';
import { mixedRoleLabel } from 'src/roles/utils/mixed-role-label.util';
import {
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER as MOVE,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER as PICKING,
  STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER as WAREHOUSE,
} from 'src/stock/stock-universal-identifiers.constant';

const ALL_RIGHTS = { canReadObjectRecords: true, canUpdateObjectRecords: true, canSoftDeleteObjectRecords: true, canDestroyObjectRecords: true };
const READ_ONLY = { canReadObjectRecords: true, canUpdateObjectRecords: false, canSoftDeleteObjectRecords: false, canDestroyObjectRecords: false };
const READ_WRITE = { canReadObjectRecords: true, canUpdateObjectRecords: true, canSoftDeleteObjectRecords: false, canDestroyObjectRecords: false };

const mix = (keys: string[]) => mixBlocks(keys, BUILDING_BLOCKS, ROLE_MODULES);

describe('closeBlocks', () => {
  it('adds the groups a group implies, all the way down (All Documents includes Own Documents and the internal user)', () => {
    expect(closeBlocks([BLOCK_KEYS.salesAll], BUILDING_BLOCKS)).toEqual([BLOCK_KEYS.employee, BLOCK_KEYS.salesAll, BLOCK_KEYS.salesOwn].sort());
  });

  it('drops a key no block has', () => {
    expect(closeBlocks([BLOCK_KEYS.inventoryAdministrator, 'gone.block'], BUILDING_BLOCKS)).toEqual(
      [BLOCK_KEYS.employee, BLOCK_KEYS.inventoryAdministrator, BLOCK_KEYS.inventoryUser].sort(),
    );
  });
});

describe('mixBlocks: object rights are the union of the blocks', () => {
  it('an inventory user with Products: Create edits products but only reads warehouses (stock user and internal user read warehouses; only the manager writes them)', () => {
    const definition = mix([BLOCK_KEYS.inventoryUser, BLOCK_KEYS.productsCreate]);

    expect(definition.objectRights[WAREHOUSE]).toEqual(READ_ONLY);
    // product template: stock user reads, the Create group has every right
    expect(definition.objectRights[PRODUCT_TEMPLATE]).toEqual(ALL_RIGHTS);
    // stock picking: the stock user has every right
    expect(definition.objectRights[PICKING]).toEqual(ALL_RIGHTS);
  });

  it('the inventory administrator adds delete on moves to what the stock user may (stock user: read, write, create; manager: all)', () => {
    expect(mix([BLOCK_KEYS.inventoryUser]).objectRights[MOVE]).toEqual(READ_WRITE);
    expect(mix([BLOCK_KEYS.inventoryAdministrator]).objectRights[MOVE]).toEqual(ALL_RIGHTS);
    expect(mix([BLOCK_KEYS.inventoryAdministrator]).objectRights[WAREHOUSE]).toEqual(ALL_RIGHTS);
  });

  it('a salesperson reads, writes and creates leads but does not delete them; the sales manager does', () => {
    expect(mix([BLOCK_KEYS.salesOwn]).objectRights[LEAD]).toEqual(READ_WRITE);
    expect(mix([BLOCK_KEYS.salesAdministrator]).objectRights[LEAD]).toEqual(ALL_RIGHTS);
    expect(mix([BLOCK_KEYS.salesOwn]).objectRights[STAGE]).toEqual(READ_ONLY);
  });

  it('only the workspace admin changes campaign stages and tags; the sales manager reads them', () => {
    expect(mix([BLOCK_KEYS.salesAdministrator]).objectRights[UTM_STAGE]).toEqual(READ_ONLY);
    expect(mix([BLOCK_KEYS.salesAdministrator]).objectRights[UTM_TAG]).toEqual(READ_ONLY);
  });

  it('Employee alone opens no Platform object, and every mix opens the objects Platform does not own', () => {
    expect(mix([BLOCK_KEYS.employee]).objectRights).toEqual({});
    expect(mix([BLOCK_KEYS.employee]).opensObjectsOutsidePlatform).toBe(true);
    expect(mix([BLOCK_KEYS.inventoryUser]).opensObjectsOutsidePlatform).toBe(true);
  });
});

describe('mixBlocks: row rules join with OR; a block with no rule does not widen', () => {
  it('Own Documents reads its own leads and the leads with no salesperson', () => {
    expect(mix([BLOCK_KEYS.salesOwn]).rowRules).toEqual({ [LEAD]: 'mineOrUnowned' });
  });

  it('All Documents holds both rules, and the wider one wins', () => {
    expect(mix([BLOCK_KEYS.salesAll]).rowRules).toEqual({ [LEAD]: 'all' });
  });

  it('a block with no rule on leads does not widen them', () => {
    expect(mix([BLOCK_KEYS.inventoryAdministrator, BLOCK_KEYS.salesOwn]).rowRules).toEqual({ [LEAD]: 'mineOrUnowned' });
  });

  it('with no block rule on an object the mix has no rule there (every row)', () => {
    expect(mix([BLOCK_KEYS.inventoryUser]).rowRules).toEqual({});
  });

  it('mine joined with mineOrUnowned is mineOrUnowned', () => {
    const blocks: BuildingBlock[] = [
      { key: 'a', label: 'A', implies: [], objectRights: [], hiddenFields: [], permissionFlags: [], canAccessAllTools: false, opensObjectsOutsidePlatform: false, rowRules: [{ objectUniversalIdentifier: 'obj', scope: 'mine' }] },
      { key: 'b', label: 'B', implies: [], objectRights: [], hiddenFields: [], permissionFlags: [], canAccessAllTools: false, opensObjectsOutsidePlatform: false, rowRules: [{ objectUniversalIdentifier: 'obj', scope: 'mineOrUnowned' }] },
    ];

    expect(mixBlocks(['a', 'b'], blocks, []).rowRules).toEqual({ obj: 'mineOrUnowned' });
  });
});

describe('mixBlocks: the objects a mix lists', () => {
  it('Sales: Own Documents lists the thirteen Sales objects', () => {
    expect(Object.keys(mix([BLOCK_KEYS.salesOwn]).objectRights).sort()).toEqual(SALES_ROLE_TABLE.map((entry) => entry.objectUniversalIdentifier).sort());
  });

  it('Inventory User lists the objects its table column opens', () => {
    expect(Object.keys(mix([BLOCK_KEYS.inventoryUser]).objectRights).sort()).toEqual(
      INVENTORY_ROLE_TABLE.filter((entry) => entry.user !== '-').map((entry) => entry.objectUniversalIdentifier).sort(),
    );
  });
});

describe('mixBlocks: fields, flags, tools', () => {
  const block = (key: string, overrides: Partial<BuildingBlock>): BuildingBlock => ({
    key,
    label: key,
    implies: [],
    objectRights: [{ objectUniversalIdentifier: 'obj', rights: 'R' }],
    hiddenFields: [],
    permissionFlags: [],
    canAccessAllTools: false,
    opensObjectsOutsidePlatform: false,
    rowRules: [],
    ...overrides,
  });
  const SECRET = { objectUniversalIdentifier: 'obj', fieldUniversalIdentifier: 'secret' };

  it('hides a field only when every block that opens its object hides it (a field limited to groups is visible to any of them)', () => {
    expect(mixBlocks(['a', 'b'], [block('a', { hiddenFields: [SECRET] }), block('b', { hiddenFields: [SECRET] })], []).hiddenFields).toEqual([SECRET]);
    expect(mixBlocks(['a', 'b'], [block('a', { hiddenFields: [SECRET] }), block('b', {})], []).hiddenFields).toEqual([]);
  });

  it('a block that does not open the object does not keep a field visible', () => {
    expect(
      mixBlocks(['a', 'b'], [block('a', { hiddenFields: [SECRET] }), block('b', { objectRights: [{ objectUniversalIdentifier: 'other', rights: 'R' }] })], []).hiddenFields,
    ).toEqual([SECRET]);
  });

  it('a field of an object Platform does not own stays visible when a block opens that object without hiding it', () => {
    const employeeLike = block('e', { objectRights: [], opensObjectsOutsidePlatform: true });
    const hider = block('h', { hiddenFields: [SECRET] });

    expect(mixBlocks(['e', 'h'], [employeeLike, hider], [], new Set()).hiddenFields).toEqual([]);
    expect(mixBlocks(['e', 'h'], [employeeLike, hider], [], new Set(['obj'])).hiddenFields).toEqual([SECRET]);
  });

  it('adds settings flags together and opens the tools when any block does', () => {
    const definition = mixBlocks(['a', 'b'], [block('a', { permissionFlags: ['VIEWS'] }), block('b', { permissionFlags: ['APPLICATIONS', 'VIEWS'], canAccessAllTools: true })], []);

    expect(definition.permissionFlags).toEqual(['APPLICATIONS', 'VIEWS']);
    expect(definition.canAccessAllTools).toBe(true);
  });
});

describe('mixedRoleLabel and mixedRoleId', () => {
  it('names Employee and the highest level of each module, in module order', () => {
    expect(mixedRoleLabel(closeBlocks([BLOCK_KEYS.salesOwn, BLOCK_KEYS.inventoryUser], BUILDING_BLOCKS), BUILDING_BLOCKS, ROLE_MODULES)).toBe(
      'Employee + Inventory User + Sales: Own Documents',
    );
    expect(mixedRoleLabel(closeBlocks([BLOCK_KEYS.salesAdministrator], BUILDING_BLOCKS), BUILDING_BLOCKS, ROLE_MODULES)).toBe('Employee + Sales: Administrator');
  });

  it('maps the same mix to the same id in a workspace, whatever the order, and another mix or workspace to another id', () => {
    const own = closeBlocks([BLOCK_KEYS.salesOwn], BUILDING_BLOCKS);

    expect(mixedRoleId('ws-1', own)).toBe(mixedRoleId('ws-1', [...own].reverse()));
    expect(mixedRoleId('ws-1', own)).not.toBe(mixedRoleId('ws-1', closeBlocks([BLOCK_KEYS.salesAll], BUILDING_BLOCKS)));
    expect(mixedRoleId('ws-1', own)).not.toBe(mixedRoleId('ws-2', own));
    expect(mixedRoleId('ws-1', own)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
