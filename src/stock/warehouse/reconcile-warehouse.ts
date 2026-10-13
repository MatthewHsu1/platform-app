import { refuseLocationArchive } from 'src/stock/location/rules/location-refusals';
import { translate } from 'src/shared/i18n/translate';
import { STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import {
  planWarehouseFlows,
  WAREHOUSE_LOCATION_FIELDS,
  WAREHOUSE_TYPE_FIELDS,
} from 'src/stock/utils/plan-warehouse-flows.util';
import { reconcileWarehouseRouting } from 'src/stock/warehouse/reconcile-warehouse-routing';
import { warehouseRowId } from 'src/stock/warehouse/warehouse-row-id';
import { graphqlWarehouseStore } from 'src/stock/warehouse/warehouse-store';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';
import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';
import { type NewRowRole } from 'src/stock/utils/types/new-row-role.type';
import { type WarehouseFlowsPlan } from 'src/stock/utils/types/warehouse-flows-plan.type';
import { type NewRow } from 'src/stock/warehouse/types/new-row.type';
import { type WarehouseChange } from 'src/stock/warehouse/types/warehouse-change.type';
import { type WarehouseEvent } from 'src/stock/warehouse/types/warehouse-event.type';
import { type WarehouseStore } from 'src/stock/warehouse/types/warehouse-store.type';
import { type WarehouseTable } from 'src/stock/warehouse/types/warehouse-table.type';
import { type WarehouseBefore } from 'src/stock/warehouse/types/warehouse-before.type';

const SUB_LOCATION_BARCODE_SUFFIXES = ['STOCK', 'INPUT', 'QUALITY', 'OUTPUT', 'PACKING'];
const SEQUENCE_SUFFIXES = ['in', 'quality control', 'storage', 'internal', 'picking', 'packing', 'out', 'cross dock'];
const NEW_ROW_ROLES: NewRowRole[] = [
  ...WAREHOUSE_LOCATION_FIELDS,
  ...WAREHOUSE_TYPE_FIELDS,
  ...WAREHOUSE_TYPE_FIELDS.map((field) => `${field}Sequence` as const),
];
const TYPE_FIELD_SET = new Set<string>(WAREHOUSE_TYPE_FIELDS);

const roleOfTable = (role: NewRowRole): WarehouseTable =>
  role.endsWith('Sequence') ? 'sequences' : TYPE_FIELD_SET.has(role) ? 'types' : 'locations';

const missingOnly = (rows: NewRow[], existing: Set<string>) => rows.filter((row) => !existing.has(row.id));

const readRoleRows = async (store: WarehouseStore, warehouse: WarehouseRow, newIds: Record<NewRowRole, string>) => {
  const idsOf = (table: WarehouseTable) => NEW_ROW_ROLES.filter((role) => roleOfTable(role) === table).map((role) => newIds[role]);
  const pointed = (fields: readonly (typeof WAREHOUSE_LOCATION_FIELDS)[number][] | readonly (typeof WAREHOUSE_TYPE_FIELDS)[number][]) =>
    fields.map((field) => warehouse[field as keyof WarehouseRow] as string | null).filter((id): id is string => id !== null);
  const locations = await store.readRows('locations', [...new Set([...pointed(WAREHOUSE_LOCATION_FIELDS), ...idsOf('locations')])]);
  const pickingTypes = await store.readRows('types', [...new Set([...pointed(WAREHOUSE_TYPE_FIELDS), ...idsOf('types')])]);
  const sequenceIds = [
    ...pickingTypes.map((type) => type.referenceSequenceId).filter((id): id is string => id !== null),
    ...idsOf('sequences'),
  ];
  const sequences = await store.readRows('sequences', [...new Set(sequenceIds)]);

  return { locations, pickingTypes, sequences };
};

// A warehouse never loses these rows: a trashed one comes back before the
// plan reads it.
const restoreTrashed = async (store: WarehouseStore, read: Awaited<ReturnType<typeof readRoleRows>>) => {
  const live = <TRow extends { id: string; deletedAt?: string | null }>(table: WarehouseTable, rows: TRow[]) =>
    rows.map((row) => (row.deletedAt ? { ...row, deletedAt: null } : row));

  for (const [table, rows] of [['locations', read.locations], ['sequences', read.sequences], ['types', read.pickingTypes]] as const) {
    const trashed = rows.filter((row) => row.deletedAt).map((row) => row.id);
    if (trashed.length > 0) {
      await store.restoreRows(table, trashed);
    }
  }

  return {
    locations: live('locations', read.locations),
    pickingTypes: live('types', read.pickingTypes),
    sequences: live('sequences', read.sequences),
  };
};

// The whole save is refused when a location it would archive holds stock: nothing is written, the saved values go back, a note says why.
const refuse = async (store: WarehouseStore, warehouse: WarehouseRow, before: WarehouseBefore | undefined, reason: string) => {
  const changed =
    before !== undefined &&
    (before.receptionSteps !== warehouse.receptionSteps ||
      before.deliverySteps !== warehouse.deliverySteps ||
      (before.active !== undefined && before.active !== warehouse.active));

  if (before !== undefined && changed) {
    await store.putBackWarehouse(
      warehouse.id,
      {
        receptionSteps: before.receptionSteps,
        deliverySteps: before.deliverySteps,
        ...(before.active === undefined ? {} : { active: before.active }),
      },
      reason,
    );
    return;
  }
  await store.noteOnWarehouse(warehouse.id, translate(null, 'Warehouse not updated'), reason);
};

const splitWarehouseUpdate = (update: Record<string, unknown>) => {
  const entries = Object.entries(update);

  return {
    locationStage: Object.fromEntries(entries.filter(([field]) => !TYPE_FIELD_SET.has(field))),
    typeStage: Object.fromEntries(entries.filter(([field]) => TYPE_FIELD_SET.has(field))),
  };
};

const writePlan = async (
  store: WarehouseStore,
  warehouseId: string,
  plan: WarehouseFlowsPlan,
  stored: Set<string>,
  warehouseUpdate: Record<string, unknown>,
) => {
  const { locationStage, typeStage } = splitWarehouseUpdate(warehouseUpdate);
  const newLocations = missingOnly(plan.locationCreates, stored);
  // The view first: the other new locations point at it.
  const views = newLocations.filter((row) => row.data.locationId === null);
  const others = newLocations.filter((row) => row.data.locationId !== null);

  if (views.length > 0) {
    await store.createRows('locations', views);
  }
  if (others.length > 0) {
    await store.createRows('locations', others);
  }
  if (Object.keys(locationStage).length > 0) {
    await store.updateWarehouse(warehouseId, locationStage);
  }
  for (const row of plan.locationUpdates) {
    await store.updateRow('locations', row.id, row.data);
  }

  const newSequences = missingOnly(plan.sequenceCreates, stored);
  if (newSequences.length > 0) {
    await store.createRows('sequences', newSequences);
  }
  for (const row of plan.sequenceUpdates) {
    await store.updateRow('sequences', row.id, row.data);
  }

  const newTypes = missingOnly(plan.typeCreates, stored);
  if (newTypes.length > 0) {
    await store.createRows('types', newTypes);
  }
  for (const row of plan.typeLinks) {
    await store.updateRow('types', row.id, row.data);
  }
  if (Object.keys(typeStage).length > 0) {
    await store.updateWarehouse(warehouseId, typeStage);
  }
  for (const row of plan.typeUpdates) {
    await store.updateRow('types', row.id, row.data);
  }
};

export const makeReconcileWarehouse =
  ({
    refuseLocationArchive,
    store = graphqlWarehouseStore,
    reconcileRouting,
  }: {
    refuseLocationArchive: (locationIds: string[]) => Promise<string | null>;
    store?: WarehouseStore;
    // The routes and rules point at the locations and types written here, so they come after.
    reconcileRouting?: (warehouseId: string, event: WarehouseEvent, change: WarehouseChange) => Promise<void>;
  }) =>
  async (warehouseId: string, event: WarehouseEvent, change: WarehouseChange = {}) => {
    const { before } = change;
    const stored = await store.readWarehouse(warehouseId);

    if (stored === undefined) {
      return;
    }
    const newIds = Object.fromEntries(NEW_ROW_ROLES.map((role) => [role, warehouseRowId(warehouseId, role)])) as Record<NewRowRole, string>;
    const read = await readRoleRows(store, stored, newIds);
    const { locations, pickingTypes, sequences } = await restoreTrashed(store, read);
    const storedIds = new Set([...locations, ...pickingTypes, ...sequences].map((row) => row.id));

    // Rows an earlier stopped run made, that the warehouse does not point at yet.
    const adopted: Record<string, string> = {};
    for (const field of [...WAREHOUSE_LOCATION_FIELDS, ...WAREHOUSE_TYPE_FIELDS]) {
      if (stored[field] === null && storedIds.has(newIds[field])) {
        adopted[field] = newIds[field];
      }
    }
    const warehouse: WarehouseRow = { ...stored, ...adopted };

    const defaultCode = (await store.readWorkspaceName()).slice(0, 5);
    const code = warehouse.code !== null && warehouse.code.length > 0 ? warehouse.code : defaultCode;
    const barcodeCode = code.replace(/ /g, '').toUpperCase();
    const ownIds = new Set(Object.values(newIds));
    const usedBarcodes = (
      await store.findLocationBarcodes(SUB_LOCATION_BARCODE_SUFFIXES.map((suffix) => `${barcodeCode}${suffix}`))
    ).filter((row) => !ownIds.has(row.id));
    const usedSequenceNames = (
      await store.findSequenceNames(SEQUENCE_SUFFIXES.map((suffix) => `${warehouse.name ?? ''} Sequence ${suffix}`))
    ).filter((row) => !ownIds.has(row.id));
    const [vendorsLocationId, customersLocationId] = await Promise.all([
      store.findSeedLocationId(STOCK_SEED_KEYS.suppliers),
      store.findSeedLocationId(STOCK_SEED_KEYS.customers),
    ]);

    if (vendorsLocationId === null || customersLocationId === null) {
      throw new Error(translate(null, 'The Vendors and Customers locations are missing: install the Platform app again.'));
    }
    const locationIds = WAREHOUSE_LOCATION_FIELDS.map((field) => warehouse[field]).filter((id): id is string => id !== null);
    const activeChanged = event === 'archived' || event === 'unarchived';
    const view = locations.find((location) => location.id === warehouse.viewLocationId);
    const otherLocationsUnderView =
      activeChanged && view?.parentPath
        ? (await store.findLocationsUnderPath(view.parentPath)).filter((location) => !locationIds.includes(location.id))
        : [];
    const renamed = before !== undefined && (before.name !== warehouse.name || before.code !== warehouse.code);

    const plan = planWarehouseFlows({
      warehouse,
      locations,
      otherLocationsUnderView,
      pickingTypes,
      sequences,
      usedBarcodes: usedBarcodes.map((row) => row.barcode),
      usedSequenceNames: usedSequenceNames.map((row) => row.name),
      maxTypeSequence: await store.readMaxTypeSequence(),
      vendorsLocationId,
      customersLocationId,
      defaultCode,
      renamed,
      activeChanged,
      // Only the install's own first run leaves batching off: an operation type of that
      // warehouse made again later gets the flags, as on any other warehouse.
      installWarehouse: warehouse.seedKey === STOCK_SEED_KEYS.warehouse0 && event === 'created',
      newIds,
    });

    // Receipts and deliveries return to each other: set on a type made by this
    // run or by a stopped one that did not get to it.
    const typeById = new Map<string, PickingTypeRow>(pickingTypes.map((type) => [type.id, type]));
    const typeIdOf = (field: 'inTypeId' | 'outTypeId') => warehouse[field] ?? plan.warehouseUpdate[field];
    const inId = typeIdOf('inTypeId') as string | null | undefined;
    const outId = typeIdOf('outTypeId') as string | null | undefined;
    const needsLink = (id: string) =>
      plan.typeCreates.some((create) => create.id === id) ||
      (Object.values(adopted).includes(id) && typeById.get(id)?.returnPickingTypeId === null);
    plan.typeLinks = [];
    if (outId && inId && needsLink(outId)) {
      plan.typeLinks.push({ id: outId, data: { returnPickingTypeId: inId } });
    }
    if (outId && inId && needsLink(inId)) {
      plan.typeLinks.push({ id: inId, data: { returnPickingTypeId: outId } });
    }

    const archived = plan.locationUpdates.filter((update) => update.data.active === false).map((update) => update.id);
    const refusal = archived.length === 0 ? null : await refuseLocationArchive(archived);

    if (refusal !== null) {
      await refuse(store, stored, before, refusal);
      return;
    }
    await writePlan(store, stored.id, plan, storedIds, { ...adopted, ...plan.warehouseUpdate });
    if (reconcileRouting !== undefined) {
      await reconcileRouting(stored.id, event, change);
    }

    if (warehouse.viewLocationId !== null || plan.warehouseUpdate.viewLocationId !== undefined) {
      await store.recomputeLocations([(plan.warehouseUpdate.viewLocationId as string | undefined) ?? (warehouse.viewLocationId as string)]);
    }
  };

export const reconcileWarehouse = makeReconcileWarehouse({ refuseLocationArchive, reconcileRouting: reconcileWarehouseRouting });
