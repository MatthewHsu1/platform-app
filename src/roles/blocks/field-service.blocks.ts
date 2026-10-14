import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { FIELD_SERVICE_ROLE_TABLE } from 'src/roles/field-service-role-table';
import { type BuildingBlock } from 'src/roles/types/building-block.type';
import { type FieldServiceRoleRow } from 'src/roles/types/field-service-role-row.type';

// No row rule: every level sees every order. "Own documents" names a narrower level that filters nothing yet;
// what sets it apart is that it may not complete an order.
const fieldServiceBlock = (
  key: string,
  label: string,
  implies: string[],
  column: 'userOwn' | 'user' | 'dispatcher' | 'manager',
): BuildingBlock => ({
  key,
  label,
  implies,
  objectRights: FIELD_SERVICE_ROLE_TABLE.filter((entry: FieldServiceRoleRow) => entry[column] !== '-').map((entry) => ({
    objectUniversalIdentifier: entry.objectUniversalIdentifier,
    rights: entry[column],
  })),
  opensObjectsOutsidePlatform: false,
  hiddenFields: [],
  permissionFlags: [],
  canAccessAllTools: true,
  rowRules: [],
});

export const FIELD_SERVICE_USER_OWN_BLOCK = fieldServiceBlock(
  BLOCK_KEYS.fieldServiceUserOwn,
  'Field service: User (own documents)',
  [BLOCK_KEYS.employee],
  'userOwn',
);

export const FIELD_SERVICE_USER_BLOCK = fieldServiceBlock(BLOCK_KEYS.fieldServiceUser, 'Field service: User', [BLOCK_KEYS.fieldServiceUserOwn], 'user');

// The dispatcher also cancels orders and makes service locations and workers from contacts.
export const FIELD_SERVICE_DISPATCHER_BLOCK = fieldServiceBlock(
  BLOCK_KEYS.fieldServiceDispatcher,
  'Field service: Dispatcher',
  [BLOCK_KEYS.fieldServiceUser],
  'dispatcher',
);

export const FIELD_SERVICE_MANAGER_BLOCK = fieldServiceBlock(
  BLOCK_KEYS.fieldServiceManager,
  'Field service: Manager',
  [BLOCK_KEYS.fieldServiceDispatcher],
  'manager',
);
