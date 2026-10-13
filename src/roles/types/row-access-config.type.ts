import { type RowRuleScope } from 'src/roles/types/row-rule-scope.type';

// The row rules the server reads from the ROW_ACCESS_CONFIG variable.
export type RowAccessConfig = {
  version: 2;
  objects: { objectUniversalIdentifier: string; ownerFieldUniversalIdentifier: string }[];
  roles: { roleId: string; rules: { objectUniversalIdentifier: string; scope: RowRuleScope }[] }[];
};
