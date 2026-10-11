import { createHash } from 'node:crypto';

import { uuidFromBytes } from 'src/shared/utils/uuid-from-bytes.util';

// A row's id depends only on its warehouse and role, so a run that stopped
// half-way finds the rows it made instead of making a second set.
export const warehouseRowId = (warehouseId: string, role: string) =>
  uuidFromBytes(createHash('sha1').update(`stock-warehouse:${warehouseId}:${role}`).digest(), 5);
