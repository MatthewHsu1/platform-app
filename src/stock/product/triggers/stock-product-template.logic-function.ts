import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { copyCategoryToOrderpoints } from 'src/stock/orderpoint/orderpoint-cascade';
import { handleBecomesStorable } from 'src/stock/product/rules/becomes-storable';
import { handleProductUomChange } from 'src/stock/product/rules/product-uom-change';
import { handleResponsibleDefault } from 'src/stock/product/rules/responsible-default';
import { handleStorableFlag } from 'src/stock/product/rules/storable-flag';
import { type ProductTemplateEventRecord } from 'src/stock/product/types/product-template-event-record.type';
import { STOCK_PRODUCT_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<ProductTemplateEventRecord>>) => {
  const { operation, events } = readEvents<ProductTemplateEventRecord>(payload);
  const errors = errorCollector();

  // The unit rule runs before the tracking rule: a unit put back must not leave a reset half done.
  await handleStorableFlag(events, operation, errors);
  await handleProductUomChange(events, operation, errors);
  await handleBecomesStorable(events, operation, errors);
  await handleResponsibleDefault(events, operation, errors);
  await copyCategoryToOrderpoints(events, operation, errors);
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_PRODUCT_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-product-template',
  description:
    'Turns inventory tracking off for products that are not goods, balances the move history when tracking is turned on, fills the responsible user, refuses or applies a unit change on moved products, and copies a changed category onto the reordering rules.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'productTemplate.*', batchMode: true },
});
