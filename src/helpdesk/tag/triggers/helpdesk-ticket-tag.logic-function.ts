import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { TAG_DELETE_RULES } from 'src/helpdesk/delete-rules/tag-delete-rules';
import { HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import 'src/helpdesk/tag/tag-delete-entries';
import 'src/helpdesk-sla/sla-delete-entries';
import { readEvents } from 'src/shared/triggers/batch-events';
import { records } from 'src/shared/triggers/records';

const tags = records('helpdeskTicketTag', 'helpdeskTicketTags');

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'deleted') {
    await applyDeleteRules(
      tags,
      TAG_DELETE_RULES,
      events.map((event) => event.recordId),
    );
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.helpdeskTicketTag,
  name: 'platform-helpdesk-ticket-tag',
  description: 'Removes a deleted work case tag from the cases that carried it.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'helpdeskTicketTag.*', batchMode: true },
});
