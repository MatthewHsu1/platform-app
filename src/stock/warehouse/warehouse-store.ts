import { addNote, putBack } from 'src/shared/triggers/put-back';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { findSeedLocationId } from 'src/stock/location/read-locations';
import { recomputeLocation } from 'src/stock/location/recompute-location';
import { irSequences, stockLocations, stockPickingTypes, stockWarehouses } from 'src/stock/stock-records';
import { PICKING_TYPE_ROW, SEQUENCE_ROW, WAREHOUSE_ROW } from 'src/stock/stock-rows';
import { readWorkspaceDisplayName } from 'src/stock/warehouse/workspace-name';
import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';
import { type WarehouseStore } from 'src/stock/warehouse/types/warehouse-store.type';
import { type WarehouseTable } from 'src/stock/warehouse/types/warehouse-table.type';
import { type WarehouseRowOf } from 'src/stock/warehouse/types/warehouse-row-of.type';

const TABLES = { locations: stockLocations, sequences: irSequences, types: stockPickingTypes } as const;
const SELECTIONS = {
  locations: 'id name active parentPath deletedAt',
  sequences: `${SEQUENCE_ROW} deletedAt`,
  types: `${PICKING_TYPE_ROW} deletedAt`,
} as const;

export const graphqlWarehouseStore: WarehouseStore = {
  readWarehouse: async (id) => (await stockWarehouses.find<WarehouseRow>({ id: { eq: id } }, WAREHOUSE_ROW))[0],

  readRows: async <TTable extends WarehouseTable>(table: TTable, ids: string[]) =>
    ids.length === 0
      ? []
      : ((await TABLES[table].findIncludingDeleted({ id: { in: ids } }, SELECTIONS[table])) as WarehouseRowOf[TTable][]),

  findLocationBarcodes: (barcodes) =>
    stockLocations.findIncludingDeleted<{ id: string; barcode: string }>({ barcode: { in: barcodes } }, 'id barcode'),

  findSequenceNames: (names) => irSequences.findIncludingDeleted<{ id: string; name: string }>({ name: { in: names } }, 'id name'),

  findLocationsUnderPath: (parentPath) =>
    stockLocations.find<{ id: string; active: boolean }>({ parentPath: { like: `${parentPath}%` } }, 'id active'),

  readMaxTypeSequence: async () => {
    const data = requireData(
      await twentyGraphql<{ stockPickingTypes: { edges: { node: { sequence: number | null } }[] } }>(
        'application',
        `{ stockPickingTypes(filter: { sequence: { is: NOT_NULL } }, orderBy: [{ sequence: DescNullsLast }], first: 1) {
          edges { node { sequence } }
        } }`,
      ),
      'Highest operation type sequence',
    );

    return data.stockPickingTypes.edges[0]?.node.sequence ?? 0;
  },

  findSeedLocationId,
  readWorkspaceName: readWorkspaceDisplayName,

  createRows: async (table, rows) => {
    if (rows.length > 0) {
      await TABLES[table].createMany(rows.map((row) => ({ id: row.id, ...row.data })));
    }
  },
  restoreRows: async (table, ids) => {
    await TABLES[table].restoreMany(ids);
  },
  updateRow: (table, id, data) => TABLES[table].update(id, data),
  updateWarehouse: (id, data) => stockWarehouses.update(id, data),
  recomputeLocations: recomputeLocation,

  putBackWarehouse: (id, data, reason) =>
    putBack({ objectSingular: 'stockWarehouse', objectPlural: 'stockWarehouses', recordId: id, data, reason }),
  noteOnWarehouse: (id, title, body) => addNote({ objectSingular: 'stockWarehouse', recordId: id, title, body }),
};
