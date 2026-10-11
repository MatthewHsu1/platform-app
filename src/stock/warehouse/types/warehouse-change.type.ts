import { type WarehouseBefore } from 'src/stock/warehouse/types/warehouse-before.type';

// The routing part reads the resupply and global-rule fields.
export type WarehouseChange = {
  before?: WarehouseBefore;
  resupplyAdded?: string[];
  resupplyRemoved?: string[];
  refreshGlobalRules?: boolean;
  // Names this request; a run that stopped and is run again keeps it, so the rows
  // it makes anew each time are made once per request.
  requestId?: string;
};
