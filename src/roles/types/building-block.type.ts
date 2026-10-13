import { type HiddenField } from 'src/roles/types/hidden-field.type';
import { type Rights } from 'src/roles/types/rights.type';
import { type RowRuleScope } from 'src/roles/types/row-rule-scope.type';

// One module's level of access. Platform adds blocks together into one Twenty role per mix; a block
// is never a role of its own. It grants only what it lists: a Platform object it does not list stays closed.
export type BuildingBlock = {
  key: string;
  label: string;
  // Lower blocks this one includes, as a higher level includes the lower.
  implies: string[];
  objectRights: { objectUniversalIdentifier: string; rights: Rights }[];
  // True when the block opens every object Platform does not own (Twenty's own objects, objects made
  // in the workspace, other apps' objects) with Twenty's Member rights, whatever objects exist later.
  opensObjectsOutsidePlatform: boolean;
  hiddenFields: HiddenField[];
  permissionFlags: string[];
  canAccessAllTools: boolean;
  rowRules: { objectUniversalIdentifier: string; scope: RowRuleScope }[];
};
