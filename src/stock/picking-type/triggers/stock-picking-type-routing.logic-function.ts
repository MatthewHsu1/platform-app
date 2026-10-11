import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { writeRuleMessages } from 'src/stock/rule/write-rule-messages';

const MESSAGE_FIELDS = new Set(['name', 'defaultLocationDest', 'defaultLocationDestId']);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<{ id: string }>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'updated') {
    const changed = events.filter((event) => updatedFieldsOf(event).some((field) => MESSAGE_FIELDS.has(field)));

    if (changed.length > 0) {
      await writeRuleMessages({ pickingTypeId: { in: changed.map((event) => event.recordId) } });
    }
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockPickingType,
  name: 'platform-stock-picking-type-routing',
  description: 'Rewrites the explanation of the rules of an operation type whose name or default destination changed.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockPickingType.updated', batchMode: true },
});
