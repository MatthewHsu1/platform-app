import { type HiddenField } from 'src/roles/types/hidden-field.type';
import { type ObjectRightsFlags } from 'src/roles/types/object-rights-flags.type';
import { type RowRuleScope } from 'src/roles/types/row-rule-scope.type';

// The Twenty role one mix of blocks makes. Maps are keyed by object universal identifier.
// objectRights lists only the Platform objects some block opens; opensObjectsOutsidePlatform says the
// role also opens every object Platform does not own, with Twenty's Member rights.
export type MixedRoleDefinition = {
  blockKeys: string[];
  label: string;
  objectRights: Record<string, ObjectRightsFlags>;
  opensObjectsOutsidePlatform: boolean;
  hiddenFields: HiddenField[];
  permissionFlags: string[];
  canAccessAllTools: boolean;
  rowRules: Record<string, RowRuleScope>;
};
