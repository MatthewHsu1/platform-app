import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { handleScrapDefaults } from 'src/stock/scrap/rules/scrap-defaults';
import { handleScrapDeletes } from 'src/stock/scrap/rules/scrap-deletes';
import { type ScrapEventRecord } from 'src/stock/scrap/types/scrap-event-record.type';
import { STOCK_SCRAP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<ScrapEventRecord>>) => {
  const { operation, events } = readEvents<ScrapEventRecord>(payload);
  const errors = errorCollector();

  await handleScrapDefaults(events, operation, errors);
  await handleScrapDeletes(events, operation, errors);
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_SCRAP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-scrap',
  description: 'Fills a scrap order unit and locations, and puts back deletes of done scrap orders.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockScrap.*', batchMode: true },
});
