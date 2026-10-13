import { describe, expect, it } from 'vitest';

import {
  planWarehouseFlows,
  WAREHOUSE_LOCATION_FIELDS,
  WAREHOUSE_TYPE_FIELDS,
} from 'src/stock/utils/plan-warehouse-flows.util';
import { type WarehouseFlowsInput } from 'src/stock/utils/types/warehouse-flows-input.type';
import { type WarehouseFlowsPlan } from 'src/stock/utils/types/warehouse-flows-plan.type';

const NEW_IDS = Object.fromEntries(
  [...WAREHOUSE_LOCATION_FIELDS, ...WAREHOUSE_TYPE_FIELDS, ...WAREHOUSE_TYPE_FIELDS.map((field) => `${field}Sequence`)].map(
    (role) => [role, `new-${role}`],
  ),
) as WarehouseFlowsInput['newIds'];

const emptyWarehouse = {
  id: 'w',
  name: 'Chicago',
  code: 'chic',
  active: true,
  receptionSteps: 'ONE_STEP' as const,
  deliverySteps: 'SHIP_ONLY' as const,
  ...Object.fromEntries([...WAREHOUSE_LOCATION_FIELDS, ...WAREHOUSE_TYPE_FIELDS].map((field) => [field, null])),
} as WarehouseFlowsInput['warehouse'];

const created = (overrides: Partial<WarehouseFlowsInput> = {}): WarehouseFlowsInput => ({
  warehouse: emptyWarehouse,
  locations: [],
  otherLocationsUnderView: [],
  pickingTypes: [],
  sequences: [],
  usedBarcodes: [],
  usedSequenceNames: [],
  maxTypeSequence: 0,
  vendorsLocationId: 'vendors',
  customersLocationId: 'customers',
  defaultCode: 'Choic',
  renamed: false,
  activeChanged: false,
  installWarehouse: false,
  newIds: NEW_IDS,
  ...overrides,
});

// The rows a plan makes, as the next run reads them back.
const applyPlan = (input: WarehouseFlowsInput, plan: WarehouseFlowsPlan): WarehouseFlowsInput => {
  const merge = <TRow extends { id: string }>(rows: TRow[], creates: { id: string; data: Record<string, unknown> }[], updates: { id: string; data: Record<string, unknown> }[]) =>
    [...rows, ...creates.map((create) => ({ id: create.id, ...create.data }) as unknown as TRow)].map((existing) => ({
      ...existing,
      ...Object.assign({}, ...updates.filter((update) => update.id === existing.id).map((update) => update.data)),
    }));

  return {
    ...input,
    warehouse: { ...input.warehouse, ...plan.warehouseUpdate } as WarehouseFlowsInput['warehouse'],
    locations: merge(input.locations, plan.locationCreates, plan.locationUpdates),
    sequences: merge(input.sequences, plan.sequenceCreates, plan.sequenceUpdates),
    pickingTypes: merge(input.pickingTypes, plan.typeCreates, [...plan.typeUpdates, ...plan.typeLinks]),
    usedBarcodes: [...input.usedBarcodes, ...plan.locationCreates.flatMap((create) => (create.data.barcode ? [String(create.data.barcode)] : []))],
    usedSequenceNames: [...input.usedSequenceNames, ...plan.sequenceCreates.map((create) => String(create.data.name))],
    renamed: false,
    activeChanged: false,
  };
};

const byId = (rows: { id: string; data: Record<string, unknown> }[]) => Object.fromEntries(rows.map((row) => [row.id, row.data]));

describe('planWarehouseFlows: a new warehouse', () => {
  const plan = planWarehouseFlows(created());
  const locations = byId(plan.locationCreates);
  const types = byId(plan.typeCreates);
  const sequences = byId(plan.sequenceCreates);

  it('makes the view and the five locations, active by the steps, with barcodes', () => {
    expect(plan.locationCreates[0].id).toBe('new-viewLocationId');
    expect(locations['new-viewLocationId']).toEqual({ name: 'chic', usage: 'VIEW', active: true, locationId: null });
    expect(locations['new-lotStockId']).toEqual({ name: 'Stock', usage: 'INTERNAL', active: true, replenishLocation: true, barcode: 'CHICSTOCK', locationId: 'new-viewLocationId' });
    expect(locations['new-whInputStockLocId']).toMatchObject({ name: 'Input', active: false, barcode: 'CHICINPUT' });
    expect(locations['new-whQcStockLocId']).toMatchObject({ name: 'Quality Control', active: false, barcode: 'CHICQUALITY' });
    expect(locations['new-whOutputStockLocId']).toMatchObject({ name: 'Output', active: false, barcode: 'CHICOUTPUT' });
    expect(locations['new-whPackStockLocId']).toMatchObject({ name: 'Packing Zone', active: false, barcode: 'CHICPACKING' });
  });

  it('makes eight sequences named after the warehouse and prefixed with the code', () => {
    expect(sequences['new-intTypeIdSequence']).toEqual({ name: 'Chicago Sequence internal', prefix: 'chic/INT/', padding: 5, numberNext: 1, numberIncrement: 1 });
    expect(sequences['new-qcTypeIdSequence'].name).toBe('Chicago Sequence quality control');
    expect(Object.keys(sequences)).toHaveLength(8);
  });

  it('makes eight operation types with their defaults, order and barcodes', () => {
    expect(types['new-intTypeId']).toMatchObject({
      name: 'Internal Transfers',
      code: 'INTERNAL',
      sequenceCode: 'INT',
      sequence: 4,
      barcode: 'CHICINT',
      active: true,
      defaultLocationSrcId: 'new-lotStockId',
      defaultLocationDestId: 'new-lotStockId',
      useCreateLots: false,
      useExistingLots: true,
      referenceSequenceId: 'new-intTypeIdSequence',
      warehouseId: 'w',
    });
    expect(types['new-inTypeId']).toMatchObject({ code: 'INCOMING', defaultLocationSrcId: 'vendors', defaultLocationDestId: 'new-lotStockId', useExistingLots: false, useCreateLots: true, printLabel: false, sequence: 1 });
    expect(types['new-outTypeId']).toMatchObject({ code: 'OUTGOING', defaultLocationSrcId: 'new-lotStockId', defaultLocationDestId: 'customers', useCreateLots: false, useExistingLots: true, printLabel: true, sequence: 7 });
    expect(types['new-pickTypeId']).toMatchObject({ active: false, defaultLocationSrcId: 'new-lotStockId', defaultLocationDestId: 'new-whPackStockLocId' });
    expect(types['new-xdockTypeId']).toMatchObject({ active: false, defaultLocationSrcId: 'new-whInputStockLocId', defaultLocationDestId: 'new-whOutputStockLocId' });
  });

  it('links receipts and deliveries as each other\'s return type', () => {
    expect(plan.typeLinks).toEqual([
      { id: 'new-outTypeId', data: { returnPickingTypeId: 'new-inTypeId' } },
      { id: 'new-inTypeId', data: { returnPickingTypeId: 'new-outTypeId' } },
    ]);
  });

  it('batches its receipts and deliveries by contact, not its other types', () => {
    expect(types['new-inTypeId']).toMatchObject({ autoBatch: true, batchGroupByPartner: true });
    expect(types['new-outTypeId']).toMatchObject({ autoBatch: true, batchGroupByPartner: true });
    expect(types['new-intTypeId'].autoBatch).toBeUndefined();
  });

  it('leaves batching off on the warehouse the install makes', () => {
    const first = byId(planWarehouseFlows(created({ installWarehouse: true })).typeCreates);
    expect(first['new-inTypeId'].autoBatch).toBeUndefined();
    expect(first['new-outTypeId'].batchGroupByPartner).toBeUndefined();
  });

  it('writes the new row ids on the warehouse', () => {
    expect(plan.warehouseUpdate).toMatchObject({ viewLocationId: 'new-viewLocationId', lotStockId: 'new-lotStockId', inTypeId: 'new-inTypeId', xdockTypeId: 'new-xdockTypeId' });
  });

  it('fills an empty code from the workspace name', () => {
    const noCode = planWarehouseFlows(created({ warehouse: { ...emptyWarehouse, code: null } }));
    expect(noCode.warehouseUpdate.code).toBe('Choic');
    expect(byId(noCode.locationCreates)['new-lotStockId'].barcode).toBe('CHOICSTOCK');
  });

  it('leaves a barcode another location already has empty, and marks a taken sequence name as a copy', () => {
    const clash = planWarehouseFlows(created({ usedBarcodes: ['CHICSTOCK'], usedSequenceNames: ['Chicago Sequence in'] }));
    expect(byId(clash.locationCreates)['new-lotStockId'].barcode).toBeNull();
    expect(byId(clash.sequenceCreates)['new-inTypeIdSequence'].name).toBe('Chicago Sequence in (copy)(new-inTypeIdSequence)');
  });

  it('writes nothing on a second run', () => {
    const second = planWarehouseFlows(applyPlan(created(), plan));
    expect(second).toEqual({ locationCreates: [], locationUpdates: [], sequenceCreates: [], sequenceUpdates: [], typeCreates: [], typeUpdates: [], typeLinks: [], warehouseUpdate: {} });
  });
});

describe('planWarehouseFlows: changes', () => {
  const made = applyPlan(created(), planWarehouseFlows(created()));

  it('renames the view, re-prefixes the sequences and follows the type barcodes on a code change', () => {
    const plan = planWarehouseFlows({ ...made, warehouse: { ...made.warehouse, code: 'CH' }, renamed: true });
    expect(byId(plan.locationUpdates)['new-viewLocationId']).toEqual({ name: 'CH' });
    expect(byId(plan.sequenceUpdates)['new-intTypeIdSequence']).toEqual({ prefix: 'CH/INT/' });
    expect(byId(plan.typeUpdates)['new-intTypeId']).toEqual({ barcode: 'CHINT' });
  });

  it('switches locations and types by the steps and keeps a changed prefix', () => {
    const custom = { ...made, sequences: made.sequences.map((sequence) => (sequence.id === 'new-outTypeIdSequence' ? { ...sequence, prefix: 'chic/OUT/LOREM/' } : sequence)) };
    const plan = planWarehouseFlows({ ...custom, warehouse: { ...custom.warehouse, receptionSteps: 'TWO_STEPS', deliverySteps: 'PICK_PACK_SHIP' } });
    expect(byId(plan.locationUpdates)).toEqual({
      'new-whInputStockLocId': { active: true },
      'new-whOutputStockLocId': { active: true },
      'new-whPackStockLocId': { active: true },
    });
    expect(byId(plan.typeUpdates)).toEqual({
      'new-inTypeId': { defaultLocationDestId: 'new-whInputStockLocId' },
      'new-outTypeId': { defaultLocationSrcId: 'new-whOutputStockLocId' },
      'new-pickTypeId': { active: true },
      'new-packTypeId': { active: true, defaultLocationDestId: 'new-whOutputStockLocId' },
      'new-storeTypeId': { active: true, defaultLocationSrcId: 'new-whInputStockLocId' },
      'new-xdockTypeId': { active: true },
    });
    expect(plan.sequenceUpdates).toEqual([]);
  });

  it('keeps the batch settings staff changed on a later save', () => {
    const unticked = { ...made, pickingTypes: made.pickingTypes.map((type) => (type.id === 'new-inTypeId' ? { ...type, autoBatch: false } : type)) };
    const plan = planWarehouseFlows({ ...unticked, warehouse: { ...unticked.warehouse, code: 'CH' }, renamed: true });
    expect(byId(plan.typeUpdates)['new-inTypeId']).toEqual({ barcode: 'CHIN' });
  });

  it('archives every location and type, and a location staff made under it', () => {
    const plan = planWarehouseFlows({
      ...made,
      warehouse: { ...made.warehouse, active: false },
      activeChanged: true,
      otherLocationsUnderView: [{ id: 'trunk', active: true }],
    });
    expect(byId(plan.locationUpdates)).toEqual({
      'new-viewLocationId': { active: false },
      'new-lotStockId': { active: false },
      trunk: { active: false },
    });
    expect(Object.values(byId(plan.typeUpdates)).filter((data) => data.active === false)).toHaveLength(3);
    expect(byId(plan.typeUpdates)['new-inTypeId']).toEqual({ active: false });
  });

  it('brings back the stock location, receipts, deliveries and internal transfers on unarchive, not the step locations', () => {
    const archived = applyPlan(made, planWarehouseFlows({ ...made, warehouse: { ...made.warehouse, active: false }, activeChanged: true, otherLocationsUnderView: [{ id: 'trunk', active: true }] }));
    const plan = planWarehouseFlows({
      ...archived,
      warehouse: { ...archived.warehouse, active: true },
      activeChanged: true,
      otherLocationsUnderView: [{ id: 'trunk', active: false }],
    });
    expect(byId(plan.locationUpdates)).toEqual({
      'new-viewLocationId': { active: true },
      'new-lotStockId': { active: true },
      trunk: { active: true },
    });
    expect(byId(plan.typeUpdates)).toEqual({
      'new-inTypeId': { active: true },
      'new-outTypeId': { active: true },
      'new-intTypeId': { active: true },
    });
  });
});
