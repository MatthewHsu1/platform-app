import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { HELPDESK_TYPE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-type/helpdesk-type-universal-identifiers.constant';
import { TYPE_DELETE_RULES } from 'src/helpdesk-type/type-delete-rules';
import { readEvents } from 'src/shared/triggers/batch-events';
import { records } from 'src/shared/triggers/records';

const types = records('helpdeskTicketType', 'helpdeskTicketTypes');

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'deleted') {
    await applyDeleteRules(
      types,
      TYPE_DELETE_RULES,
      events.map((event) => event.recordId),
    );
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_TYPE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.type,
  name: 'platform-helpdesk-ticket-type',
  description: 'Clears a deleted work case type from its cases and removes its team links.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'helpdeskTicketType.*', batchMode: true },
});
