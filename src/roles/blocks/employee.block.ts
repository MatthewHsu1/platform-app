import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { type BuildingBlock } from 'src/roles/types/building-block.type';

// Every staff member holds it: Twenty's Member rights (read, edit, delete and destroy) on every
// object Platform does not own, including objects made later, and nothing on Platform's own
// objects, which the module blocks open.
export const EMPLOYEE_BLOCK: BuildingBlock = {
  key: BLOCK_KEYS.employee,
  label: 'Employee',
  implies: [],
  objectRights: [],
  opensObjectsOutsidePlatform: true,
  hiddenFields: [],
  permissionFlags: [],
  canAccessAllTools: true,
  rowRules: [],
};
