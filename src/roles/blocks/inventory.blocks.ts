import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { INVENTORY_ROLE_TABLE } from 'src/roles/inventory-role-table';
import { type BuildingBlock } from 'src/roles/types/building-block.type';
import { type InventoryRoleRow } from 'src/roles/types/inventory-role-row.type';

const columnRights = (column: 'user' | 'administrator' | 'productsCreate') =>
  INVENTORY_ROLE_TABLE.filter((row: InventoryRoleRow) => row[column] !== '-').map((row) => ({
    objectUniversalIdentifier: row.objectUniversalIdentifier,
    rights: row[column],
  }));

const inventoryBlock = (key: string, label: string, implies: string[], column: 'user' | 'administrator' | 'productsCreate'): BuildingBlock => ({
  key,
  label,
  implies,
  objectRights: columnRights(column),
  opensObjectsOutsidePlatform: false,
  hiddenFields: [],
  permissionFlags: [],
  canAccessAllTools: true,
  rowRules: [],
});

export const INVENTORY_USER_BLOCK = inventoryBlock(BLOCK_KEYS.inventoryUser, 'Inventory User', [BLOCK_KEYS.employee], 'user');

export const INVENTORY_ADMINISTRATOR_BLOCK = inventoryBlock(
  BLOCK_KEYS.inventoryAdministrator,
  'Inventory Administrator',
  [BLOCK_KEYS.inventoryUser],
  'administrator',
);

export const PRODUCTS_CREATE_BLOCK = inventoryBlock(BLOCK_KEYS.productsCreate, 'Products: Create', [BLOCK_KEYS.employee], 'productsCreate');
