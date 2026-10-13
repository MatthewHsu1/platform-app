import { warehouseBatchFlags } from 'src/stock-picking-batch/utils/warehouse-batch-flags.util';
import { DELIVERY_STEPS, LOCATION_USAGE, PICKING_TYPE_CODE, RECEPTION_STEPS } from 'src/stock/stock-options.constant';
import { type DeliverySteps } from 'src/stock/types/delivery-steps.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type ReceptionSteps } from 'src/stock/types/reception-steps.type';
import { type Row } from 'src/stock/utils/types/row.type';
import { type WarehouseFlowsInput } from 'src/stock/utils/types/warehouse-flows-input.type';
import { type WarehouseFlowsPlan } from 'src/stock/utils/types/warehouse-flows-plan.type';
import { type WarehouseLocationField } from 'src/stock/utils/types/warehouse-location-field.type';
import { type WarehouseTypeField } from 'src/stock/utils/types/warehouse-type-field.type';

export const WAREHOUSE_LOCATION_FIELDS = [
  'viewLocationId',
  'lotStockId',
  'whInputStockLocId',
  'whQcStockLocId',
  'whOutputStockLocId',
  'whPackStockLocId',
] as const;
export const WAREHOUSE_TYPE_FIELDS = [
  'inTypeId',
  'qcTypeId',
  'storeTypeId',
  'intTypeId',
  'pickTypeId',
  'packTypeId',
  'outTypeId',
  'xdockTypeId',
] as const;
const SUB_LOCATIONS: {
  field: Exclude<WarehouseLocationField, 'viewLocationId'>;
  name: string;
  barcodeSuffix: string;
  active: (reception: ReceptionSteps, delivery: DeliverySteps) => boolean;
}[] = [
  { field: 'lotStockId', name: 'Stock', barcodeSuffix: 'STOCK', active: () => true },
  { field: 'whInputStockLocId', name: 'Input', barcodeSuffix: 'INPUT', active: (reception) => reception !== RECEPTION_STEPS.ONE_STEP },
  { field: 'whQcStockLocId', name: 'Quality Control', barcodeSuffix: 'QUALITY', active: (reception) => reception === RECEPTION_STEPS.THREE_STEPS },
  { field: 'whOutputStockLocId', name: 'Output', barcodeSuffix: 'OUTPUT', active: (_reception, delivery) => delivery !== DELIVERY_STEPS.SHIP_ONLY },
  { field: 'whPackStockLocId', name: 'Packing Zone', barcodeSuffix: 'PACKING', active: (_reception, delivery) => delivery === DELIVERY_STEPS.PICK_PACK_SHIP },
];

const TYPES: {
  field: WarehouseTypeField;
  name: string;
  code: PickingTypeCode;
  sequenceCode: string;
  order: number;
  sequenceSuffix: string;
}[] = [
  { field: 'inTypeId', name: 'Receipts', code: PICKING_TYPE_CODE.INCOMING, sequenceCode: 'IN', order: 1, sequenceSuffix: 'in' },
  { field: 'qcTypeId', name: 'Quality Control', code: PICKING_TYPE_CODE.INTERNAL, sequenceCode: 'QC', order: 2, sequenceSuffix: 'quality control' },
  { field: 'storeTypeId', name: 'Storage', code: PICKING_TYPE_CODE.INTERNAL, sequenceCode: 'STOR', order: 3, sequenceSuffix: 'storage' },
  { field: 'intTypeId', name: 'Internal Transfers', code: PICKING_TYPE_CODE.INTERNAL, sequenceCode: 'INT', order: 4, sequenceSuffix: 'internal' },
  { field: 'pickTypeId', name: 'Pick', code: PICKING_TYPE_CODE.INTERNAL, sequenceCode: 'PICK', order: 5, sequenceSuffix: 'picking' },
  { field: 'packTypeId', name: 'Pack', code: PICKING_TYPE_CODE.INTERNAL, sequenceCode: 'PACK', order: 6, sequenceSuffix: 'packing' },
  { field: 'outTypeId', name: 'Delivery Orders', code: PICKING_TYPE_CODE.OUTGOING, sequenceCode: 'OUT', order: 7, sequenceSuffix: 'out' },
  { field: 'xdockTypeId', name: 'Cross Dock', code: PICKING_TYPE_CODE.INTERNAL, sequenceCode: 'XD', order: 8, sequenceSuffix: 'cross dock' },
];

const differs = (current: Record<string, unknown> | undefined, wanted: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(wanted).filter(([field, value]) => current?.[field] !== value));

const pushIfAny = (rows: Row[], id: string, data: Record<string, unknown>) => {
  if (Object.keys(data).length > 0) {
    rows.push({ id, data });
  }
};

export const planWarehouseFlows = (input: WarehouseFlowsInput): WarehouseFlowsPlan => {
  const { warehouse, newIds } = input;
  const plan: WarehouseFlowsPlan = {
    locationCreates: [],
    locationUpdates: [],
    sequenceCreates: [],
    sequenceUpdates: [],
    typeCreates: [],
    typeUpdates: [],
    typeLinks: [],
    warehouseUpdate: {},
  };
  const code = warehouse.code !== null && warehouse.code.length > 0 ? warehouse.code : input.defaultCode;
  const barcodeCode = code.replace(/ /g, '').toUpperCase();
  const reception = warehouse.receptionSteps;
  const delivery = warehouse.deliverySteps;

  if (code !== warehouse.code) {
    plan.warehouseUpdate.code = code;
  }

  const locationById = new Map(input.locations.map((location) => [location.id, location]));
  const existingLocationId = (field: WarehouseLocationField) => {
    const current = warehouse[field];

    return current !== null && locationById.has(current) ? current : null;
  };
  const locationId = (field: WarehouseLocationField) => existingLocationId(field) ?? newIds[field];

  // The view first: the other locations are made under it.
  const viewId = locationId('viewLocationId');
  if (existingLocationId('viewLocationId') === null) {
    plan.locationCreates.push({ id: viewId, data: { name: code, usage: LOCATION_USAGE.VIEW, active: warehouse.active, locationId: null } });
    plan.warehouseUpdate.viewLocationId = viewId;
  } else {
    pushIfAny(
      plan.locationUpdates,
      viewId,
      differs(locationById.get(viewId), { ...(input.renamed ? { name: code } : {}), active: warehouse.active }),
    );
  }

  const usedBarcodes = new Set(input.usedBarcodes);
  for (const sub of SUB_LOCATIONS) {
    const id = locationId(sub.field);
    const active = sub.active(reception, delivery) && warehouse.active;

    if (existingLocationId(sub.field) === null) {
      const barcode = `${barcodeCode}${sub.barcodeSuffix}`;
      plan.locationCreates.push({
        id,
        data: {
          name: sub.name,
          usage: LOCATION_USAGE.INTERNAL,
          active,
          ...(sub.field === 'lotStockId' ? { replenishLocation: true } : {}),
          barcode: usedBarcodes.has(barcode) ? null : barcode,
          locationId: viewId,
        },
      });
      plan.warehouseUpdate[sub.field] = id;
    } else {
      pushIfAny(plan.locationUpdates, id, differs(locationById.get(id), { active }));
    }
  }

  if (input.activeChanged) {
    for (const location of input.otherLocationsUnderView) {
      pushIfAny(plan.locationUpdates, location.id, differs(location, { active: warehouse.active }));
    }
  }

  const stockId = locationId('lotStockId');
  const inputId = locationId('whInputStockLocId');
  const qcId = locationId('whQcStockLocId');
  const outputId = locationId('whOutputStockLocId');
  const packId = locationId('whPackStockLocId');
  const inputLocation = reception === RECEPTION_STEPS.ONE_STEP ? stockId : inputId;
  const outputLocation = delivery === DELIVERY_STEPS.SHIP_ONLY ? stockId : outputId;

  // Values written on every run.
  const updateValues: Record<WarehouseTypeField, Record<string, unknown>> = {
    inTypeId: { defaultLocationDestId: inputLocation },
    outTypeId: { defaultLocationSrcId: outputLocation },
    pickTypeId: {
      active: delivery !== DELIVERY_STEPS.SHIP_ONLY && warehouse.active,
      defaultLocationDestId: delivery === DELIVERY_STEPS.PICK_SHIP ? outputLocation : packId,
    },
    packTypeId: { active: delivery === DELIVERY_STEPS.PICK_PACK_SHIP && warehouse.active, defaultLocationDestId: outputLocation },
    qcTypeId: { active: reception === RECEPTION_STEPS.THREE_STEPS && warehouse.active },
    storeTypeId: {
      active: reception !== RECEPTION_STEPS.ONE_STEP && warehouse.active,
      defaultLocationSrcId: reception === RECEPTION_STEPS.TWO_STEPS ? inputLocation : qcId,
    },
    intTypeId: {},
    xdockTypeId: { active: reception !== RECEPTION_STEPS.ONE_STEP && delivery !== DELIVERY_STEPS.SHIP_ONLY && warehouse.active },
  };
  // Values only a new type gets.
  const createValues: Record<WarehouseTypeField, Record<string, unknown>> = {
    inTypeId: { defaultLocationSrcId: input.vendorsLocationId, useCreateLots: true, useExistingLots: false, printLabel: false },
    outTypeId: { defaultLocationDestId: input.customersLocationId, useCreateLots: false, useExistingLots: true, printLabel: true },
    packTypeId: { defaultLocationSrcId: packId },
    pickTypeId: { defaultLocationSrcId: stockId },
    qcTypeId: { defaultLocationSrcId: inputId, defaultLocationDestId: qcId },
    storeTypeId: { defaultLocationDestId: stockId },
    intTypeId: { defaultLocationSrcId: stockId, defaultLocationDestId: stockId },
    xdockTypeId: { defaultLocationSrcId: inputId, defaultLocationDestId: outputId },
  };

  const typeById = new Map(input.pickingTypes.map((type) => [type.id, type]));
  const sequenceById = new Map(input.sequences.map((sequence) => [sequence.id, sequence]));
  const usedSequenceNames = new Set(input.usedSequenceNames);
  const createdTypes = new Map<WarehouseTypeField, string>();

  for (const type of TYPES) {
    const current = warehouse[type.field] === null ? undefined : typeById.get(warehouse[type.field] as string);
    const barcode = `${barcodeCode}${type.sequenceCode}`;
    const sequenceName = `${warehouse.name ?? ''} Sequence ${type.sequenceSuffix}`;

    if (current !== undefined) {
      const wanted: Record<string, unknown> = { ...updateValues[type.field], barcode };
      if (input.activeChanged && !('active' in updateValues[type.field])) {
        wanted.active = warehouse.active;
      }
      pushIfAny(plan.typeUpdates, current.id, differs(current, wanted));

      const sequence = current.referenceSequenceId === null ? undefined : sequenceById.get(current.referenceSequenceId);
      if (input.renamed && sequence !== undefined) {
        pushIfAny(
          plan.sequenceUpdates,
          sequence.id,
          differs(sequence, { name: sequenceName, prefix: `${code}/${current.sequenceCode ?? type.sequenceCode}/`, padding: 5 }),
        );
      }
      continue;
    }

    const sequenceId = newIds[`${type.field}Sequence`];
    plan.sequenceCreates.push({
      id: sequenceId,
      data: {
        name: usedSequenceNames.has(sequenceName) ? `${sequenceName} (copy)(${sequenceId})` : sequenceName,
        prefix: `${code}/${type.sequenceCode}/`,
        padding: 5,
        numberNext: 1,
        numberIncrement: 1,
      },
    });
    const typeId = newIds[type.field];
    plan.typeCreates.push({
      id: typeId,
      data: {
        name: type.name,
        code: type.code,
        sequenceCode: type.sequenceCode,
        sequence: input.maxTypeSequence + type.order,
        referenceSequenceId: sequenceId,
        warehouseId: warehouse.id,
        useCreateLots: false,
        useExistingLots: true,
        printLabel: false,
        active: warehouse.active,
        ...createValues[type.field],
        ...(input.installWarehouse ? {} : warehouseBatchFlags(type.field)),
        ...updateValues[type.field],
        barcode,
      },
    });
    plan.warehouseUpdate[type.field] = typeId;
    createdTypes.set(type.field, typeId);
  }

  // Receipts and deliveries return to each other, set only when made.
  const createdIn = createdTypes.get('inTypeId');
  const createdOut = createdTypes.get('outTypeId');
  if (createdOut !== undefined) {
    plan.typeLinks.push({ id: createdOut, data: { returnPickingTypeId: createdIn ?? null } });
  }
  if (createdIn !== undefined) {
    plan.typeLinks.push({ id: createdIn, data: { returnPickingTypeId: createdOut ?? null } });
  }

  return plan;
};
