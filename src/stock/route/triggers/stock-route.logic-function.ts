import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { destroyLinksOf, restoreCascaded, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeOrderpointsForRouteChanges } from 'src/stock/orderpoint/orderpoint-recompute-triggers';
import {
  stockLocations,
  stockPackageTypeStockRouteRels,
  stockRouteCategs,
  stockRouteCategTotals,
  stockRouteMoves,
  stockRouteProducts,
  stockRoutes,
  stockRouteWarehouses,
  stockRules,
  stockWarehouses,
} from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { eventAfter, eventBefore, restoredParents } from 'src/stock/stock-event-helpers';
import { anyRowWhere } from 'src/stock/stock-exists';
import { RESTRICT_DELETE_MESSAGE } from 'src/stock/stock-messages';
import { restoreForEvent } from 'src/stock/stock-put-back';

type RouteRecord = {
  id: string;
  active: boolean;
  sequence: number | null;
  deletedAt?: string | null;
  updatedBy?: { source?: string | null } | null;
};

const OBJECT = { objectSingular: 'stockRoute', objectPlural: 'stockRoutes' } as const;

const LINKS = [
  { of: stockRouteProducts, field: 'stockRouteId' },
  { of: stockRouteCategs, field: 'stockRouteId' },
  { of: stockRouteWarehouses, field: 'stockRouteId' },
  { of: stockPackageTypeStockRouteRels, field: 'stockRouteId' },
  { of: stockRouteMoves, field: 'stockRouteId' },
  { of: stockRouteCategTotals, field: 'stockRouteId' },
];

// Archiving or unarchiving a route carries its rules, archived ones too,
// whose destination is active.
const carryActiveToRules = async (routeIds: string[], active: boolean) => {
  const rules = await stockRules.find<{ id: string; active: boolean; locationDestId: string | null }>(
    { routeId: { in: routeIds } },
    'id active locationDestId',
  );
  const destinations = await stockLocations.find<{ id: string; active: boolean }>(
    { id: { in: [...new Set(rules.flatMap((rule) => rule.locationDestId ?? []))] } },
    'id active',
  );
  const activeDestinations = new Set(destinations.filter((location) => location.active).map((location) => location.id));
  const ids = rules
    .filter((rule) => rule.active !== active && rule.locationDestId !== null && activeDestinations.has(rule.locationDestId))
    .map((rule) => rule.id);

  if (ids.length > 0) {
    await stockRules.updateMany(ids, { active });
  }
};

const writeRouteSequenceToRules = async (routes: { id: string; sequence: number }[]) => {
  for (const route of routes) {
    const stale = await stockRules.find<{ id: string }>(
      {
        and: [
          { routeId: { eq: route.id } },
          { or: [{ routeSequence: { neq: route.sequence } }, { routeSequence: { is: 'NULL' } }] },
        ],
      },
      'id',
    );

    if (stale.length > 0) {
      await stockRules.updateMany(
        stale.map((rule) => rule.id),
        { routeSequence: route.sequence },
      );
    }
  }
};

// A route stays while a warehouse receives or delivers through it, or while a
// move follows one of its rules: deleting it would take those rules too.
const usedRouteIds = async (routeIds: string[]) => {
  const [warehouses, rules] = await Promise.all([
    stockWarehouses.find<{ receptionRouteId: string | null; deliveryRouteId: string | null }>(
      { or: [{ receptionRouteId: { in: routeIds } }, { deliveryRouteId: { in: routeIds } }] },
      'receptionRouteId deliveryRouteId',
    ),
    stockRules.find<{ id: string; routeId: string | null }>({ routeId: { in: routeIds } }, 'id routeId'),
  ]);
  const used = new Set(
    warehouses.flatMap((warehouse) => [warehouse.receptionRouteId, warehouse.deliveryRouteId]).filter((id) => id !== null),
  );

  for (const routeId of routeIds.filter((id) => !used.has(id))) {
    const ruleIds = rules.filter((rule) => rule.routeId === routeId).map((rule) => rule.id);

    if (ruleIds.length > 0 && (await anyRowWhere('stockMove', 'stockMoves', { ruleId: { in: ruleIds } }))) {
      used.add(routeId);
    }
  }
  return used;
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<RouteRecord>>) => {
  const { operation, events } = readEvents<RouteRecord>(payload);
  const errors = errorCollector();

  if (operation === 'updated') {
    // The warehouse writer sets its rules' flags itself.
    const staffActiveChanges = events.filter((event) => {
      const after = eventAfter(event);

      return (
        updatedFieldsOf(event).includes('active') &&
        !isApplicationWrite(after) &&
        eventBefore(event)?.active !== after?.active
      );
    });

    for (const active of [true, false]) {
      const ids = staffActiveChanges.filter((event) => eventAfter(event)?.active === active).map((event) => event.recordId);

      if (ids.length > 0) {
        await errors.run(active ? 'rules unarchived' : 'rules archived', () => carryActiveToRules(ids, active));
      }
    }
    const sequenceChanged = events.filter((event) => updatedFieldsOf(event).includes('sequence'));

    await errors.run('route sequence', () =>
      writeRouteSequenceToRules(
        sequenceChanged.map((event) => ({ id: event.recordId, sequence: eventAfter(event)?.sequence ?? 0 })),
      ),
    );
  }

  if (operation === 'deleted') {
    const deleted = await stillDeletedIds(
      stockRoutes,
      events.map((event) => event.recordId),
    );
    const used = await usedRouteIds(deleted);
    const removed = deleted.filter((id) => !used.has(id));

    for (const event of events.filter((candidate) => used.has(candidate.recordId))) {
      await errors.run(event.recordId, () => restoreForEvent({ ...OBJECT, event, message: RESTRICT_DELETE_MESSAGE }));
    }
    await errors.run('rules', () =>
      cascadeDelete({ parents: stockRoutes, parentIds: removed, children: [{ of: stockRules, field: 'routeId' }] }),
    );
    for (const { of, field } of LINKS) {
      await errors.run(of.objectPlural, () => destroyLinksOf(of, field, removed));
    }
  }

  if (operation === 'restored') {
    await errors.run('rules', () =>
      restoreCascaded({
        parents: restoredParents(events),
        children: [{ of: stockRules, field: 'routeId' }],
      }),
    );
  }
  await recomputeOrderpointsForRouteChanges(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockRoute,
  name: 'platform-stock-route',
  description:
    'Carries a route archive and its sequence to its rules, keeps routes that warehouses or moves use, deletes or restores the rules and link rows of a deleted route, and recomputes the reordering rules in the background.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockRoute.*', batchMode: true },
});
