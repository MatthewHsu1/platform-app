import { type RowAccessConfig } from 'src/roles/types/row-access-config.type';

// Installed value, until the install hook writes the real list.
export const EMPTY_ROW_ACCESS_CONFIG: RowAccessConfig = { version: 2, objects: [], roles: [] };
