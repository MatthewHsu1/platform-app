import { describe, expect, it } from 'vitest';

import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { ROLE_MODULES } from 'src/roles/role-modules';
import { closeBlocks } from 'src/roles/utils/close-blocks.util';
import { blockKeysToLevels, levelsToBlockKeys } from 'src/roles/utils/member-levels.util';

describe('levelsToBlockKeys', () => {
  it('gives Employee plus the block of each chosen level', () => {
    expect(levelsToBlockKeys({ inventory: 'administrator', products: 'none', sales: 'own' }, ROLE_MODULES)).toEqual([
      BLOCK_KEYS.employee,
      BLOCK_KEYS.inventoryAdministrator,
      BLOCK_KEYS.salesOwn,
    ]);
  });

  it('gives Employee alone for None everywhere, and reads an unknown module or level as None', () => {
    expect(levelsToBlockKeys({ inventory: 'none', sales: 'boss', helpdesk: 'all' }, ROLE_MODULES)).toEqual([BLOCK_KEYS.employee]);
  });
});

describe('blockKeysToLevels', () => {
  it('shows the highest level of each module the mix holds', () => {
    expect(blockKeysToLevels(closeBlocks([BLOCK_KEYS.salesAll, BLOCK_KEYS.inventoryUser], BUILDING_BLOCKS), ROLE_MODULES)).toEqual({
      inventory: 'user',
      products: 'none',
      sales: 'all',
    });
  });
});
