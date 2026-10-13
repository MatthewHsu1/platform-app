import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { clearReferences, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeOrderpointsForRuleChanges } from 'src/stock/orderpoint/orderpoint-recompute-triggers';
import { stockPickingTypes, stockRoutes, stockRules, stockWarehouses } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { writeRuleMessages } from 'src/stock/rule/write-rule-messages';
import { eventAfter } from 'src/stock/stock-event-helpers';
import { anyRowWhere } from 'src/stock/stock-exists';
import { RESTRICT_DELETE_MESSAGE } from 'src/stock/stock-messages';
import { restoreForEvent } from 'src/stock/stock-put-back';
import { planRuleTypeLocations } from 'src/stock/utils/plan-routing-rows.util';

type RuleRecord = {
  id: string;
  routeId: string | null;
  routeSequence: number | null;
  pickingTypeId: string | null;
  locationSrcId: string | null;
  locationDestId: string | null;
  updatedBy?: { source?: string | null } | null;
};

const OBJECT = { objectSingular: 'stockRule', objectPlural: 'stockRules' } as const;
const MESSAGE_FIELDS = ['action', 'locationSrc', 'locationDest', 'pickingType', 'procureMethod', 'locationDestFromRule'];

const isMessageChange = (fields: string[]) => fields.some((field) => MESSAGE_FIELDS.includes(field.replace(/Id$/, '')));

// The operation type's default locations go onto a new rule's empty
// locations, and onto both when a user picks another type alone.
const copyTypeLocations = async (operation: 'created' | 'updated', events: ObjectRecordEvent<RuleRecord>[]) => {
  const candidates = events.flatMap((event) => {
    const after = eventAfter(event);

    return after !== undefined && after.pickingTypeId !== null && (operation === 'created' || !isApplicationWrite(after))
      ? [{ event, after }]
      : [];
  });

  if (candidates.length === 0) {
    return;
  }
  const types = await stockPickingTypes.find<{
    id: string;
    defaultLocationSrcId: string | null;
    defaultLocationDestId: string | null;
  }>({ id: { in: [...new Set(candidates.map(({ after }) => after.pickingTypeId))] } }, 'id defaultLocationSrcId defaultLocationDestId');
  const errors = errorCollector();

  for (const { event, after } of candidates) {
    const values = planRuleTypeLocations({
      operation,
      updatedFields: updatedFieldsOf(event),
      rule: after,
      pickingType: types.find((type) => type.id === after.pickingTypeId) ?? null,
    });

    await errors.run(event.recordId, () => stockRules.update(event.recordId, values));
  }
  errors.throwIfAny();
};

// Every rule, the app's own included, carries its route's sequence.
const syncRuleRouteSequence = async (ruleIds: string[]) => {
  const rules = await stockRules.find<RuleRecord>({ id: { in: ruleIds } }, 'id routeId routeSequence');
  const routes = await stockRoutes.find<{ id: string; sequence: number | null }>(
    { id: { in: [...new Set(rules.flatMap((rule) => rule.routeId ?? []))] } },
    'id sequence',
  );

  for (const rule of rules) {
    const sequence = routes.find((route) => route.id === rule.routeId)?.sequence ?? 0;

    if (rule.routeSequence !== sequence) {
      await stockRules.update(rule.id, { routeSequence: sequence });
    }
  }
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<RuleRecord>>) => {
  const { operation, events } = readEvents<RuleRecord>(payload);
  const errors = errorCollector();

  if (operation === 'created' || operation === 'updated') {
    await errors.run('locations', () => copyTypeLocations(operation, events));
    const sequenceIds = events
      .filter((event) => operation === 'created' || updatedFieldsOf(event).some((field) => field === 'route' || field === 'routeId'))
      .map((event) => event.recordId);

    await errors.run('route sequence', () => syncRuleRouteSequence(sequenceIds));
    const messageIds = events
      .filter((event) => operation === 'created' || isMessageChange(updatedFieldsOf(event)))
      .map((event) => event.recordId);

    if (messageIds.length > 0) {
      await errors.run('explanation', () => writeRuleMessages({ id: { in: messageIds } }));
    }
  }

  if (operation === 'deleted') {
    const deleted = await stillDeletedIds(
      stockRules,
      events.map((event) => event.recordId),
    );
    const used = new Set<string>();
    // A rule whose check failed keeps its warehouse pointer: a later run may still put it back.
    const unchecked = new Set(deleted);

    for (const id of deleted) {
      await errors.run(id, async () => {
        if (await anyRowWhere('stockMove', 'stockMoves', { ruleId: { eq: id } })) {
          used.add(id);
        }
        unchecked.delete(id);
      });
    }
    for (const event of events.filter((candidate) => used.has(candidate.recordId))) {
      await errors.run(event.recordId, () => restoreForEvent({ ...OBJECT, event, message: RESTRICT_DELETE_MESSAGE }));
    }
    await errors.run('make-to-order rules', () =>
      clearReferences(
        stockWarehouses,
        'mtoPullId',
        deleted.filter((id) => !used.has(id) && !unchecked.has(id)),
      ),
    );
  }
  await recomputeOrderpointsForRuleChanges(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockRule,
  name: 'platform-stock-rule',
  description:
    "Writes each rule's explanation and route sequence, copies its operation type's locations, keeps rules that moves use, clears a deleted make-to-order rule from its warehouse, and recomputes the reordering rules in the background.",
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockRule.*', batchMode: true },
});
