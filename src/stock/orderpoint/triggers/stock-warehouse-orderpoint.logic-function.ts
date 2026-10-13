import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { nextNumberByCode } from 'src/base/sequence/next-number';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { isApplicationWrite, isStaffDelete } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { addNote } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { sameValue } from 'src/shared/utils/same-value.util';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { ORDERPOINT_VALUE_SELECTION, stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { recomputeRevivedOrderpoints } from 'src/stock/orderpoint/orderpoint-recompute-triggers';
import { recomputeOrderpoint } from 'src/stock/orderpoint/recompute-orderpoint';
import { addReplenishmentIssueTasks } from 'src/stock/orderpoint/replenishment-issue-tasks';
import { type OrderpointRow } from 'src/stock/orderpoint/types/orderpoint-row.type';
import { isMaxTypedBelowMin, planOrderpointDefaults } from 'src/stock/orderpoint/utils/plan-orderpoint-defaults.util';
import { planQtyToOrderInverse } from 'src/stock/orderpoint/utils/plan-qty-to-order-inverse.util';
import { snoozeRefusal } from 'src/stock/orderpoint/utils/snooze-refusal.util';
import { firstWarehouse } from 'src/stock/picking-type/rules/picking-type-defaults';
import { eventAfter, eventBefore, eventChangedFields, localizedReason } from 'src/stock/stock-event-helpers';
import { ORDERPOINT_SEQUENCE_CODE } from 'src/stock/stock-options.constant';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { productProducts, stockLocations, stockWarehouses } from 'src/stock/stock-records';
import { WAREHOUSE_ROW } from 'src/stock/stock-rows';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-universal-identifiers.constant';
import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';
import { readWorkspaceDisplayName } from 'src/stock/warehouse/workspace-name';

type EventRecord = OrderpointRow & { updatedBy?: { source?: string | null } | null };
type OrderpointEvent = ObjectRecordEvent<EventRecord>;
type ProductRow = { id: string; productTmplId: string; productTmpl: { categId: string | null } | null };

const OBJECT = { objectSingular: 'stockWarehouseOrderpoint', objectPlural: 'stockWarehouseOrderpoints' } as const;
const WATCHED_FIELDS: (keyof OrderpointRow & string)[] = [
  'warehouseId',
  'locationId',
  'productId',
  'productMinQty',
  'productMaxQty',
  'routeId',
  'replenishmentUomId',
  'trigger',
  'snoozedUntil',
  'qtyToOrder',
];
// Fields whose change makes the computed quantities and dates stale.
const RECOMPUTE_FIELDS = new Set([
  'productMinQty',
  'productMaxQty',
  'productId',
  'locationId',
  'warehouseId',
  'routeId',
  'replenishmentUomId',
  'trigger',
  'qtyToOrder',
]);

const ids = (values: (string | null)[]) => [...new Set(values.flatMap((value) => (value === null ? [] : [value])))];

// Warehouses, the warehouse of each location and the category of each product,
// read once per batch and then for any row that has moved on since its event.
const readContext = async (rows: EventRecord[]) => {
  const warehouses = await stockWarehouses.find<WarehouseRow>({}, WAREHOUSE_ROW);
  const locationWarehouses = new Map<string, string | null>();
  const products = new Map<string, ProductRow>();

  const loadLocations = async (locationIds: string[]) => {
    const missing = locationIds.filter((id) => !locationWarehouses.has(id));
    for (const location of await stockLocations.find<{ id: string; warehouseId: string | null }>({ id: { in: missing } }, 'id warehouseId')) {
      locationWarehouses.set(location.id, location.warehouseId);
    }
  };
  const loadProducts = async (productIds: string[]) => {
    const missing = productIds.filter((id) => !products.has(id));
    for (const product of await productProducts.find<ProductRow>(
      { id: { in: missing } },
      'id productTmplId productTmpl { deletedAt categId }',
    )) {
      products.set(product.id, product);
    }
  };
  await loadLocations(ids(rows.map((row) => row.locationId)));
  await loadProducts(ids(rows.map((row) => row.productId)));

  return {
    firstWarehouseId: firstWarehouse(warehouses.filter((warehouse) => warehouse.active))?.id ?? null,
    warehouseLotStockIds: new Map(
      warehouses.flatMap((warehouse) => (warehouse.lotStockId === null ? [] : [[warehouse.id, warehouse.lotStockId] as const])),
    ),
    locationWarehouseId: async (locationId: string | null) => {
      if (locationId === null) {
        return null;
      }
      await loadLocations([locationId]);
      return locationWarehouses.get(locationId) ?? null;
    },
    product: async (productId: string | null) => {
      if (productId === null) {
        return undefined;
      }
      await loadProducts([productId]);
      return products.get(productId);
    },
  };
};

type Context = Awaited<ReturnType<typeof readContext>>;

const readRow = async (id: string) =>
  (
    await stockWarehouseOrderpoints.find<OrderpointRow & { updatedBy: { source: string | null } | null }>(
      { id: { eq: id } },
      `${ORDERPOINT_VALUE_SELECTION} updatedBy { source }`,
    )
  )[0];

// Twenty counts trashed rows in the unique (product, location) key too.
const isKeyTaken = async (row: OrderpointRow, locationId: string) =>
  row.productId !== null &&
  (
    await stockWarehouseOrderpoints.findIncludingDeleted<{ id: string }>(
      { productId: { eq: row.productId }, locationId: { eq: locationId }, id: { neq: row.id } },
      'id',
    )
  ).length > 0;

// A refused new rule never existed, so it is removed. The note goes on the
// product (written first, so a rerun finds it) and the reason is the error.
const refuseCreate = async (
  event: OrderpointEvent,
  product: ProductRow | undefined,
  message: string,
  values?: TranslationValues,
): Promise<never> => {
  const reason = await localizedReason(event, message, values);

  if (product !== undefined) {
    await addNote({
      objectSingular: 'productTemplate',
      recordId: product.productTmplId,
      title: 'Change undone',
      body: reason,
      id: derivedId('orderpointRefused', event.recordId),
    });
  }
  await stockWarehouseOrderpoints.destroyMany([event.recordId]);
  throw new Error(reason);
};

const changesOf = (row: OrderpointRow, data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).filter(([field, value]) => !sameValue(row[field as keyof OrderpointRow], value)));

const without = (data: Record<string, unknown>, field: string) =>
  Object.fromEntries(Object.entries(data).filter(([key]) => key !== field));

// Returns whether the rule's computed values need a recompute.
const handleSave = async (event: OrderpointEvent, created: boolean, context: Context) => {
  const before = eventBefore(event);
  const after = eventAfter(event);

  if (after === undefined) {
    return false;
  }
  const row = await readRow(event.recordId);

  if (row === undefined) {
    return false;
  }
  let changedFields = eventChangedFields(event, WATCHED_FIELDS);
  const product = await context.product(row.productId);
  // An edit is judged on the rule as it was before the edit.
  const refusal = snoozeRefusal({
    created,
    trigger: created ? after.trigger : (before?.trigger ?? row.trigger),
    snoozedUntil: after.snoozedUntil,
    snoozedUntilChanged: changedFields.includes('snoozedUntil'),
  });

  if (refusal === 'createSnoozedAuto') {
    return refuseCreate(event, product, ORDERPOINT_MESSAGES.createSnoozedAuto);
  }
  if (refusal === 'snoozeAuto' && sameValue(row.snoozedUntil, after.snoozedUntil)) {
    await putBackForEvent({
      ...OBJECT,
      event,
      data: { snoozedUntil: before?.snoozedUntil ?? null },
      message: ORDERPOINT_MESSAGES.snoozeAuto,
    });
  }
  let productMinQty = row.productMinQty ?? 0;
  let productMaxQty = row.productMaxQty ?? 0;

  if (isMaxTypedBelowMin({ created, changedFields, productMinQty, productMaxQty })) {
    if (created) {
      return refuseCreate(event, product, ORDERPOINT_MESSAGES.minAboveMax);
    }
    if (sameValue(row.productMinQty, after.productMinQty) && sameValue(row.productMaxQty, after.productMaxQty)) {
      // The whole save is refused, so a min saved with the max goes back too
      // and nothing is left for max to follow.
      const restored = changedFields.includes('productMinQty')
        ? { productMinQty: before?.productMinQty ?? 0, productMaxQty: before?.productMaxQty ?? 0 }
        : { productMaxQty: before?.productMaxQty ?? 0 };

      await putBackForEvent({ ...OBJECT, event, data: restored, message: ORDERPOINT_MESSAGES.minAboveMax });
      productMinQty = restored.productMinQty ?? productMinQty;
      productMaxQty = restored.productMaxQty;
      changedFields = changedFields.filter((field) => field !== 'productMinQty' && field !== 'productMaxQty');
    }
  }
  const plan = planOrderpointDefaults({
    created,
    changedFields,
    orderpoint: {
      warehouseId: row.warehouseId,
      locationId: row.locationId,
      productMinQty,
      productMaxQty,
      productCategoryId: row.productCategoryId,
    },
    saved: { warehouseId: after.warehouseId, locationId: after.locationId },
    locationWarehouseId: await context.locationWarehouseId(row.locationId),
    warehouseLotStockIds: context.warehouseLotStockIds,
    firstWarehouseId: context.firstWarehouseId,
    productCategoryId: product?.productTmpl?.categId ?? null,
  });

  if (plan.kind === 'noWarehouse') {
    return refuseCreate(event, product, ORDERPOINT_MESSAGES.noWarehouse, { company: await readWorkspaceDisplayName() });
  }
  const data = { ...plan.data };

  if (created && row.name === null) {
    data.name = (await nextNumberByCode(ORDERPOINT_SEQUENCE_CODE)) ?? '/';
  }
  // The typed quantity is what the person asked for; a later typed
  // quantity has its own save and wins.
  const typedLater = !isApplicationWrite(row) && !sameValue(row.qtyToOrder, after.qtyToOrder);

  if (!created && changedFields.includes('qtyToOrder') && !typedLater) {
    Object.assign(
      data,
      planQtyToOrderInverse({
        trigger: row.trigger,
        qtyToOrderManual: row.qtyToOrderManual ?? 0,
        typed: after.qtyToOrder ?? 0,
        computed: row.qtyToOrderComputed ?? 0,
      }),
    );
  }
  const changes = changesOf(row, data);

  try {
    await stockWarehouseOrderpoints.update(row.id, changes);
  } catch (error) {
    // Filling or moving the location can meet another rule of the same
    // product there; anything else is a real failure.
    if (typeof changes.locationId !== 'string' || !(await isKeyTaken(row, changes.locationId))) {
      throw error;
    }
    if (created) {
      return refuseCreate(event, product, ORDERPOINT_MESSAGES.duplicateRule);
    }
    await stockWarehouseOrderpoints.update(row.id, without(changes, 'locationId'));
    if (sameValue(row.warehouseId, after.warehouseId)) {
      await putBackForEvent({
        ...OBJECT,
        event,
        data: { warehouseId: before?.warehouseId ?? null },
        message: ORDERPOINT_MESSAGES.duplicateRule,
      });
    }
  }
  return created || changedFields.some((field) => RECOMPUTE_FIELDS.has(field));
};

const handler = async (payload: DatabaseEventBatchPayload<OrderpointEvent>) => {
  const { operation, events } = readEvents<EventRecord>(payload);
  const errors = errorCollector();

  if (operation === 'deleted') {
    // A deleted rule goes for good: the unique (product, location) key counts
    // trashed rows, so a new rule there would be refused. Rules the app
    // trashed with their warehouse, location or product stay in the trash.
    const staffDeleted = events.filter((event) => isStaffDelete(event)).map((event) => event.recordId);

    await errors.run('destroy', () => stockWarehouseOrderpoints.destroySoftDeleted(staffDeleted));
    errors.throwIfAny();
    return {};
  }
  await recomputeRevivedOrderpoints(events, operation, errors);
  if (operation !== 'created' && operation !== 'updated') {
    errors.throwIfAny();
    return {};
  }
  const created = operation === 'created';
  // The app's own updates (defaults, put-backs, recomputes) come back here
  // and are left alone.
  const saves = events.filter((event) => created || !isApplicationWrite(eventAfter(event)));

  if (saves.length === 0) {
    errors.throwIfAny();
    return {};
  }
  const context = await readContext(saves.flatMap((event) => eventAfter(event) ?? []));
  const toRecompute: string[] = [];

  for (const event of saves) {
    await errors.run(event.recordId, async () => {
      if (await handleSave(event, created, context)) {
        toRecompute.push(event.recordId);
      }
    });
  }
  if (toRecompute.length > 0) {
    await errors.run('recompute', async () => {
      const { failures } = await recomputeOrderpoint(toRecompute);
      await addReplenishmentIssueTasks(failures);
    });
  }
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.orderpointTrigger,
  name: 'platform-stock-orderpoint',
  description:
    'Numbers new reordering rules and fills their warehouse, location, category and maximum, keeps a typed quantity to order, puts back snoozing an automatic rule or a maximum below the minimum, removes deleted rules for good and recomputes their quantities, also when a rule comes back from the archive or the trash.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockWarehouseOrderpoint.*', batchMode: true },
});
