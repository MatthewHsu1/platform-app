import { type RowAccessRule } from 'src/row-access/types/row-access-rule.type';

export type RowAccessConfig = {
  version: 1;
  rules: RowAccessRule[];
  seeAllRoleIds: string[];
};
