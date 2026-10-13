import { type Row } from 'src/stock/utils/types/row.type';

export type WarehouseFlowsPlan = {
  locationCreates: Row[];
  locationUpdates: Row[];
  sequenceCreates: Row[];
  sequenceUpdates: Row[];
  typeCreates: Row[];
  typeUpdates: Row[];
  typeLinks: Row[];
  warehouseUpdate: Record<string, unknown>;
};
