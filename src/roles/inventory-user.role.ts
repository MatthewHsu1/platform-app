import { defineRole } from 'twenty-sdk/define';

import { INVENTORY_ROLE_TABLE } from 'src/roles/inventory-role-table';
import { INVENTORY_ROLE_UNIVERSAL_IDENTIFIERS } from 'src/roles/inventory-roles-universal-identifiers.constant';
import { rightsToPermission } from 'src/roles/utils/role-rights.util';

// Shipped with the app and assigned to nobody: an admin assigns it in Settings → Roles. Objects
// outside the inventory table may be read, edited and deleted as by a member, never destroyed; every
// tool (uploads, views, import and export) stays open as for a member.
export default defineRole({
  universalIdentifier: INVENTORY_ROLE_UNIVERSAL_IDENTIFIERS.user,
  label: 'Inventory User',
  description: 'Processes transfers, counts, scrap, lots, packages and batches; reads the warehouse setup.',
  icon: 'IconBuildingWarehouse',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canAccessAllTools: true,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: INVENTORY_ROLE_TABLE.map((row) => rightsToPermission(row.objectUniversalIdentifier, row.user)),
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [],
});
