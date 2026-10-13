import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { enqueueOrderpointRecompute } from 'src/stock/orderpoint/enqueue-orderpoint-recompute';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { movesTouchingOrderpoints } from 'src/stock/orderpoint/utils/moves-touching-orderpoints.util';
import { orderpointsForMoves } from 'src/stock/orderpoint/utils/orderpoints-for-moves.util';
import { revivedOrderpointIds } from 'src/stock/orderpoint/utils/revived-orderpoint-ids.util';
import { routeLinksTouchingOrderpoints } from 'src/stock/orderpoint/utils/route-links-touching-orderpoints.util';
import { eventAfter, eventBefore, eventChangedFields } from 'src/stock/stock-event-helpers';
import { productProducts, stockLocations } from 'src/stock/stock-records';

type AnyEvent = ObjectRecordEvent<object>;

// Fields that change which rules supply a product, or their delays.
const RULE_ROUTING_FIELDS = [
  'active',
  'action',
  'sequence',
  'routeId',
  'routeSequence',
  'locationSrcId',
  'locationDestId',
  'procureMethod',
  'warehouseId',
  'delay',
];
const ROUTE_ROUTING_FIELDS = ['active', 'sequence', 'productSelectable', 'productCategSelectable', 'supplierWhId'];
// Rule selection walks a location's parents and uses its warehouse and type.
const LOCATION_ROUTING_FIELDS = ['locationId', 'parentPath', 'warehouseId', 'usage'];

const values = (event: AnyEvent, side: 'before' | 'after') =>
  (side === 'before' ? eventBefore(event) : eventAfter(event)) as Record<string, unknown> | undefined;

const touchedLinks = (events: AnyEvent[], operation: RecordOperation, linkFields: string[]) =>
  routeLinksTouchingOrderpoints(
    operation,
    events.map((event) => ({ before: values(event, 'before'), after: values(event, 'after') })),
    linkFields,
  );

const touchesRouting = (operation: RecordOperation, event: AnyEvent, fields: string[]) =>
  operation !== 'upserted' &&
  (operation !== 'updated' || eventChangedFields(event as ObjectRecordEvent<Record<string, unknown>>, fields).length > 0);

const activeOrderpointIds = async (filter: Record<string, unknown>) =>
  (await stockWarehouseOrderpoints.find<{ id: string }>({ ...filter, active: { eq: true } }, 'id')).map((rule) => rule.id);

const enqueueActive = async (filter: Record<string, unknown>) => {
  const ids = await activeOrderpointIds(filter);

  if (ids.length > 0) {
    await enqueueOrderpointRecompute(ids);
  }
};

// A move made, changed or deleted changes the forecast of its product in the
// warehouses it leaves and enters. The app's own move writes count too.
export const recomputeOrderpointsForMoves = async (events: AnyEvent[], operation: RecordOperation, errors: ErrorCollector) => {
  const moves = movesTouchingOrderpoints(
    operation,
    events.map((event) => ({ before: values(event, 'before'), after: values(event, 'after') })),
  );

  if (moves.length === 0) {
    return;
  }
  await errors.run('reordering rules', async () => {
    const orderpoints = await stockWarehouseOrderpoints.find<{ id: string; productId: string; warehouseId: string | null }>(
      { productId: { in: [...new Set(moves.map((move) => move.productId))] }, active: { eq: true } },
      'id productId warehouseId',
    );

    if (orderpoints.length === 0) {
      return;
    }
    const locationIds = [...new Set(moves.flatMap((move) => [move.locationId, move.locationDestId]).filter((id) => id !== null))];
    const locations = await stockLocations.findIncludingDeleted<{ id: string; warehouseId: string | null }>(
      { id: { in: locationIds } },
      'id warehouseId',
    );
    const warehouseOf = new Map(locations.map((location) => [location.id, location.warehouseId]));
    const ids = orderpointsForMoves({
      moves: moves.map((move) => ({
        productId: move.productId,
        locationWarehouseId: move.locationId === null ? null : (warehouseOf.get(move.locationId) ?? null),
        locationDestWarehouseId: move.locationDestId === null ? null : (warehouseOf.get(move.locationDestId) ?? null),
      })),
      orderpoints,
    });

    if (ids.length > 0) {
      await enqueueOrderpointRecompute(ids);
    }
  });
};

// A stock rule or route can change the supply chain, lead days and default
// route of any reordering rule, so every active one is recomputed.
export const recomputeOrderpointsForRuleChanges = async (
  events: AnyEvent[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (events.some((event) => touchesRouting(operation, event, RULE_ROUTING_FIELDS))) {
    await errors.run('reordering rules', () => enqueueActive({}));
  }
};

export const recomputeOrderpointsForRouteChanges = async (
  events: AnyEvent[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (events.some((event) => touchesRouting(operation, event, ROUTE_ROUTING_FIELDS))) {
    await errors.run('reordering rules', () => enqueueActive({}));
  }
};

export const recomputeOrderpointsForLocationChanges = async (
  events: AnyEvent[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation === 'updated' && events.some((event) => touchesRouting(operation, event, LOCATION_ROUTING_FIELDS))) {
    await errors.run('reordering rules', () => enqueueActive({}));
  }
};

// Which warehouses a route serves changes the rules chosen in those
// warehouses and in every warehouse they supply.
export const recomputeOrderpointsForRouteWarehouseLinks = async (
  events: AnyEvent[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (touchedLinks(events, operation, ['stockRouteId', 'stockWarehouseId']).length > 0) {
    await errors.run('reordering rules', () => enqueueActive({}));
  }
};

// A product's own routes: the rules of its variants.
export const recomputeOrderpointsForRouteProductLinks = async (
  events: AnyEvent[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  const templateIds = [
    ...new Set(
      touchedLinks(events, operation, ['productTemplateId', 'stockRouteId']).flatMap((link) =>
        typeof link.productTemplateId === 'string' ? [link.productTemplateId] : [],
      ),
    ),
  ];

  if (templateIds.length === 0) {
    return;
  }
  await errors.run('reordering rules', async () => {
    const variants = await productProducts.findIncludingDeleted<{ id: string }>({ productTmplId: { in: templateIds } }, 'id');

    await enqueueActive({ productId: { in: variants.map((variant) => variant.id) } });
  });
};

// The rules of products in categories whose routes changed.
export const recomputeOrderpointsOfCategories = (categoryIds: string[]) =>
  categoryIds.length === 0 ? Promise.resolve() : enqueueActive({ productCategoryId: { in: categoryIds } });

// A rule brought back from the archive or the trash has numbers from before.
export const recomputeRevivedOrderpoints = async (
  events: AnyEvent[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  const ids = revivedOrderpointIds(
    operation,
    (events as ObjectRecordEvent<{ active?: boolean | null }>[]).map((event) => ({
      recordId: event.recordId,
      before: eventBefore(event),
      after: eventAfter(event),
    })),
  );

  if (ids.length > 0) {
    await errors.run('recompute', async () => {
      const active = await activeOrderpointIds({ id: { in: ids } });

      if (active.length > 0) {
        await enqueueOrderpointRecompute(active);
      }
    });
  }
};
