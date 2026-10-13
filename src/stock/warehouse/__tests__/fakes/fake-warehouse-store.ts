import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';
import { type NewRow } from 'src/stock/warehouse/types/new-row.type';
import { type WarehouseStore } from 'src/stock/warehouse/types/warehouse-store.type';
import { type WarehouseTable } from 'src/stock/warehouse/types/warehouse-table.type';

type Row = Record<string, unknown> & { id: string };

const DEFAULTS: Record<WarehouseTable, Record<string, unknown>> = {
  locations: { active: true, parentPath: null, barcode: null },
  sequences: { active: true },
  types: { active: true, returnPickingTypeId: null, referenceSequenceId: null, barcode: null },
};

// Stores rows and can stop at the Nth write. It decides no rule.
export const makeFakeWarehouseStore = ({
  warehouse,
  stopAtWrite,
}: {
  warehouse: Partial<WarehouseRow> & { id: string };
  stopAtWrite?: number;
}) => {
  const tables: Record<WarehouseTable, Map<string, Row>> = { locations: new Map(), sequences: new Map(), types: new Map() };
  const state = { warehouse: { ...warehouse } as Row, writes: 0, stopAtWrite, recomputed: [] as string[][], notes: [] as string[], putBacks: [] as Record<string, unknown>[] };
  tables.locations.set('vendors', { id: 'vendors', name: 'Vendors', ...DEFAULTS.locations });
  tables.locations.set('customers', { id: 'customers', name: 'Customers', ...DEFAULTS.locations });

  const write = () => {
    state.writes += 1;
    if (state.stopAtWrite !== undefined && state.writes === state.stopAtWrite) {
      throw new Error('stopped');
    }
  };

  const store: WarehouseStore = {
    readWarehouse: async (id) => (id === state.warehouse.id ? ({ ...state.warehouse } as unknown as WarehouseRow) : undefined),
    readRows: async (table, ids) => ids.flatMap((id) => (tables[table].has(id) ? [{ ...tables[table].get(id) }] : [])) as never,
    findLocationBarcodes: async (barcodes) =>
      [...tables.locations.values()].filter((row) => barcodes.includes(row.barcode as string)).map((row) => ({ id: row.id, barcode: row.barcode as string })),
    findSequenceNames: async (names) =>
      [...tables.sequences.values()].filter((row) => names.includes(row.name as string)).map((row) => ({ id: row.id, name: row.name as string })),
    findLocationsUnderPath: async () => [],
    readMaxTypeSequence: async () => Math.max(0, ...[...tables.types.values()].map((row) => Number(row.sequence ?? 0))),
    findSeedLocationId: async (key) => (key.includes('suppliers') ? 'vendors' : key.includes('customers') ? 'customers' : null),
    readWorkspaceName: async () => 'Choice',
    createRows: async (table, rows: NewRow[]) => {
      write();
      for (const row of rows) {
        if (tables[table].has(row.id)) {
          throw new Error(`duplicate id ${row.id}`);
        }
        tables[table].set(row.id, { ...DEFAULTS[table], ...row.data, id: row.id });
      }
    },
    restoreRows: async (table, ids) => {
      write();
      for (const id of ids) {
        tables[table].set(id, { ...tables[table].get(id)!, deletedAt: null });
      }
    },
    updateRow: async (table, id, data) => {
      write();
      tables[table].set(id, { ...tables[table].get(id)!, ...data });
    },
    updateWarehouse: async (_id, data) => {
      write();
      state.warehouse = { ...state.warehouse, ...data };
    },
    recomputeLocations: async (ids) => {
      state.recomputed.push(ids);
    },
    putBackWarehouse: async (_id, data, reason) => {
      state.putBacks.push({ ...data, reason });
    },
    noteOnWarehouse: async (_id, title, body) => {
      state.notes.push(`${title}: ${body}`);
    },
  };

  return {
    store,
    state,
    destroy: (table: WarehouseTable, id: string) => {
      tables[table].delete(id);
    },
    trash: (table: WarehouseTable, id: string) => {
      tables[table].set(id, { ...tables[table].get(id)!, deletedAt: '2026-10-09T00:00:00.000Z' });
    },
    snapshot: () => ({
      warehouse: state.warehouse,
      locations: [...tables.locations.values()].sort((a, b) => a.id.localeCompare(b.id)),
      sequences: [...tables.sequences.values()].sort((a, b) => a.id.localeCompare(b.id)),
      types: [...tables.types.values()].sort((a, b) => a.id.localeCompare(b.id)),
    }),
  };
};
