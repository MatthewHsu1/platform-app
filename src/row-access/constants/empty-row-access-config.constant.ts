import { type RowAccessConfig } from 'src/row-access/types/row-access-config.type';

// Installed value: Platform is present but no object is filtered yet. The
// server fails closed only when this value is unreadable or invalid.
export const EMPTY_ROW_ACCESS_CONFIG: RowAccessConfig = {
  version: 1,
  rules: [],
  seeAllRoleIds: [],
};
