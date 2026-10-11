import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';
import { type NewRow } from 'src/stock/warehouse/types/new-row.type';
import { type WarehouseTable } from 'src/stock/warehouse/types/warehouse-table.type';
import { type WarehouseRowOf } from 'src/stock/warehouse/types/warehouse-row-of.type';

// Everything the reconciler reads and writes, so a test can stop it at any write.
export type WarehouseStore = {
  readWarehouse: (id: string) => Promise<WarehouseRow | undefined>;
  // Archived and trashed rows too.
  readRows: <TTable extends WarehouseTable>(table: TTable, ids: string[]) => Promise<WarehouseRowOf[TTable][]>;
  // Barcodes and names of rows, archived and trashed ones too (a trashed row can come back).
  findLocationBarcodes: (barcodes: string[]) => Promise<{ id: string; barcode: string }[]>;
  findSequenceNames: (names: string[]) => Promise<{ id: string; name: string }[]>;
  findLocationsUnderPath: (parentPath: string) => Promise<{ id: string; active: boolean }[]>;
  readMaxTypeSequence: () => Promise<number>;
  findSeedLocationId: (seedKey: string) => Promise<string | null>;
  readWorkspaceName: () => Promise<string>;
  createRows: (table: WarehouseTable, rows: NewRow[]) => Promise<void>;
  restoreRows: (table: WarehouseTable, ids: string[]) => Promise<void>;
  updateRow: (table: WarehouseTable, id: string, data: Record<string, unknown>) => Promise<void>;
  updateWarehouse: (id: string, data: Record<string, unknown>) => Promise<void>;
  recomputeLocations: (rootIds: string[]) => Promise<void>;
  putBackWarehouse: (id: string, data: Record<string, unknown>, reason: string) => Promise<void>;
  noteOnWarehouse: (id: string, title: string, body: string) => Promise<void>;
};
