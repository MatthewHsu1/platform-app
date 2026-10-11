import { defineRole } from 'twenty-sdk/define';

import { INVENTORY_ROLE_TABLE } from 'src/roles/inventory-role-table';
import { INVENTORY_ROLE_UNIVERSAL_IDENTIFIERS } from 'src/roles/inventory-roles-universal-identifiers.constant';
import { rightsToPermission } from 'src/roles/utils/role-rights.util';

// Shipped with the app and assigned to nobody: an admin assigns it in Settings → Roles. Objects
// outside the inventory table keep the member defaults: read, edit and delete, never destroy.
export default defineRole({
  universalIdentifier: INVENTORY_ROLE_UNIVERSAL_IDENTIFIERS.productsCreate,
  label: 'Products: Create',
  description: 'Creates and edits products, variants, categories, pricelists and units; reads stock.',
  icon: 'IconPackage',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: INVENTORY_ROLE_TABLE.map((row) => rightsToPermission(row.objectUniversalIdentifier, row.productsCreate)),
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [],
});
