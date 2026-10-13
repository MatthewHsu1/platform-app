import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { HELPDESK_PRODUCT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/helpdesk-product/helpdesk-product-universal-identifiers.constant';
import { readEvents } from 'src/shared/triggers/batch-events';
import { clearReferences, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { records } from 'src/shared/triggers/records';

const variants = records('productProduct', 'productProducts');
const cases = records('helpdeskTicket', 'helpdeskTickets');

// Runs for every delete, whoever made it.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'deleted') {
    await clearReferences(
      cases,
      'productId',
      await stillDeletedIds(
        variants,
        events.map((event) => event.recordId),
      ),
    );
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_PRODUCT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-product-product-helpdesk-tickets',
  description: 'Clears a deleted product variant from the work cases that name it.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productProduct.*', batchMode: true },
});
