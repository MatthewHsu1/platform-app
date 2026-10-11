import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { clearReferences, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { productCategories, productRemovals, stockLocations } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { eventBefore } from 'src/stock/stock-event-helpers';
import { SEEDED_REMOVAL_KEPT_MESSAGE } from 'src/stock/stock-messages';
import { restoreForEvent } from 'src/stock/stock-put-back';

type RemovalRecord = { id: string; seedKey: string | null };

const OBJECT = { objectSingular: 'productRemoval', objectPlural: 'productRemovals' } as const;

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<RemovalRecord>>) => {
  const { operation, events } = readEvents<RemovalRecord>(payload);
  const errors = errorCollector();

  if (operation === 'deleted') {
    const seeded = events.filter((event) => (eventBefore(event)?.seedKey ?? null) !== null);
    const seededIds = new Set(seeded.map((event) => event.recordId));

    for (const event of seeded) {
      await errors.run(event.recordId, () => restoreForEvent({ ...OBJECT, event, message: SEEDED_REMOVAL_KEPT_MESSAGE }));
    }
    const removed = await stillDeletedIds(
      productRemovals,
      events.map((event) => event.recordId).filter((id) => !seededIds.has(id)),
    );

    await errors.run('locations', () => clearReferences(stockLocations, 'removalStrategyId', removed));
    await errors.run('categories', () => clearReferences(productCategories, 'removalStrategyId', removed));
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productRemoval,
  name: 'platform-product-removal',
  description: 'Puts back a deleted default removal strategy and clears any other deleted one from locations and categories.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'productRemoval.*', batchMode: true },
});
