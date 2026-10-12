import { describe, expect, it } from 'vitest';

import { holdsSalesAdministrator } from 'src/crm/settings/utils/holds-sales-administrator.util';
import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';

describe('holdsSalesAdministrator', () => {
  it('lets the workspace admin and a sales administrator run assignment', () => {
    expect(holdsSalesAdministrator({ isWorkspaceAdmin: true, blockKeys: [] })).toBe(true);
    expect(
      holdsSalesAdministrator({
        isWorkspaceAdmin: false,
        blockKeys: [BLOCK_KEYS.employee, BLOCK_KEYS.salesOwn, BLOCK_KEYS.salesAll, BLOCK_KEYS.salesAdministrator],
      }),
    ).toBe(true);
  });

  it('refuses salespeople, other roles and a caller who is no member', () => {
    expect(
      holdsSalesAdministrator({ isWorkspaceAdmin: false, blockKeys: [BLOCK_KEYS.employee, BLOCK_KEYS.salesOwn, BLOCK_KEYS.salesAll] }),
    ).toBe(false);
    expect(holdsSalesAdministrator({ isWorkspaceAdmin: false, blockKeys: [BLOCK_KEYS.employee, BLOCK_KEYS.salesOwn] })).toBe(false);
    expect(
      holdsSalesAdministrator({ isWorkspaceAdmin: false, blockKeys: [BLOCK_KEYS.employee, BLOCK_KEYS.inventoryAdministrator] }),
    ).toBe(false);
    expect(holdsSalesAdministrator({ isWorkspaceAdmin: false, blockKeys: [] })).toBe(false);
  });
});
