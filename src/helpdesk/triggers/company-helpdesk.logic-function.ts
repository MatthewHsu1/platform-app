import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { readEvents } from 'src/shared/triggers/batch-events';
import { clearReferences, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { records } from 'src/shared/triggers/records';

const companies = records('company', 'companies');
const cases = records('helpdeskTicket', 'helpdeskTickets');

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'deleted') {
    await clearReferences(
      cases,
      'companyId',
      await stillDeletedIds(
        companies,
        events.map((event) => event.recordId),
      ),
    );
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.company,
  name: 'platform-company-helpdesk-tickets',
  description: 'Clears a deleted company from the work cases that name it.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'company.*', batchMode: true },
});
