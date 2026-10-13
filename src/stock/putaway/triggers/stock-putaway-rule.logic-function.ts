import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite, isStaffDelete } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { destroyLinksOf, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { syncPutawayRules } from 'src/stock/putaway/sync-putaway-rules';
import {
  productCategories,
  productProducts,
  stockLocations,
  stockPackageTypeStockPutawayRuleRels,
  stockPutawayRules,
  stockStorageCategories,
} from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { eventAfter } from 'src/stock/stock-event-helpers';
import { putawayRulesLosingLinks } from 'src/stock/utils/plan-routing-rows.util';

type PutawayRuleRecord = { id: string; updatedBy?: { source?: string | null } | null };

type DeletedRule = {
  id: string;
  productId: string | null;
  categoryId: string | null;
  locationInId: string | null;
  locationOutId: string | null;
  storageCategoryId: string | null;
};

const isPresent = (id: string | null): id is string => id !== null;

const parentIdsOf = (rule: DeletedRule) => [
  rule.productId,
  rule.categoryId,
  rule.locationInId,
  rule.locationOutId,
  rule.storageCategoryId,
];

// A parent's delete check may put the parent back after its rules went to the
// trash; those rules come back with it, so their links stay until the parent
// is known to stay deleted.
const destroyPackageTypeLinks = async (events: ObjectRecordEvent<PutawayRuleRecord>[]) => {
  const deleted = await stockPutawayRules.findIncludingDeleted<DeletedRule & { deletedAt: string | null }>(
    { id: { in: events.map((event) => event.recordId) } },
    'id productId categoryId locationInId locationOutId storageCategoryId deletedAt',
  );
  const rules = deleted.filter((rule) => rule.deletedAt !== null);
  const parentIds = (pick: (rule: DeletedRule) => (string | null)[]) => [...new Set(rules.flatMap(pick).filter(isPresent))];
  const deletedParentIds = new Set(
    (
      await Promise.all([
        stillDeletedIds(productProducts, parentIds((rule) => [rule.productId])),
        stillDeletedIds(productCategories, parentIds((rule) => [rule.categoryId])),
        stillDeletedIds(stockLocations, parentIds((rule) => [rule.locationInId, rule.locationOutId])),
        stillDeletedIds(stockStorageCategories, parentIds((rule) => [rule.storageCategoryId])),
      ])
    ).flat(),
  );
  const staffDeleted = new Set(events.filter((event) => isStaffDelete(event)).map((event) => event.recordId));

  await destroyLinksOf(
    stockPackageTypeStockPutawayRuleRels,
    'stockPutawayRuleId',
    putawayRulesLosingLinks({
      rules: rules.map((rule) => ({ id: rule.id, isStaffDelete: staffDeleted.has(rule.id), parentIds: parentIdsOf(rule) })),
      deletedParentIds,
    }),
  );
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<PutawayRuleRecord>>) => {
  const { operation, events } = readEvents<PutawayRuleRecord>(payload);
  const errors = errorCollector();

  if (operation === 'created' || operation === 'updated') {
    const movedByUser = new Set(
      events
        .filter(
          (event) =>
            !isApplicationWrite(eventAfter(event)) &&
            updatedFieldsOf(event).some((field) => field === 'locationIn' || field === 'locationInId'),
        )
        .map((event) => event.recordId),
    );

    await errors.run('putaway rules', () =>
      syncPutawayRules({ id: { in: events.map((event) => event.recordId) } }, movedByUser),
    );
  }
  if (operation === 'deleted') {
    await errors.run('package type links', () => destroyPackageTypeLinks(events));
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockPutawayRule,
  name: 'platform-stock-putaway-rule',
  description:
    "Names each putaway rule, keeps its storage category only for the closest-location choice, keeps its store-to location inside the arrival location, and removes a deleted rule's package type links.",
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockPutawayRule.*', batchMode: true },
});
