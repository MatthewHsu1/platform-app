import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { readEvents } from 'src/shared/triggers/batch-events';
import { clearReferences, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { groupBy } from 'src/shared/utils/group-by.util';

const people = records('person', 'people');
const cases = records('helpdeskTicket', 'helpdeskTickets');

// Runs for every writer. The case copy of a contact's company follows the contact; a deleted contact
// leaves its cases (the case trigger then empties their company).
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();

  if (operation === 'updated') {
    const moved = [
      ...new Set(
        events
          .filter((event) => updatedFieldsOf(event).some((field) => field === 'company' || field === 'companyId'))
          .map((event) => event.recordId),
      ),
    ];

    if (moved.length > 0) {
      await errors.run('companies of cases', async () => {
        const contacts = await people.find<{ id: string; companyId: string | null }>({ id: { in: moved } }, 'id companyId');
        const companyOf = new Map(contacts.map((contact) => [contact.id, contact.companyId]));
        const rows = await cases.find<{ id: string; personId: string; companyId: string | null }>(
          { personId: { in: moved } },
          'id personId companyId',
        );
        const stale = rows.filter((row) => (companyOf.get(row.personId) ?? null) !== row.companyId);

        for (const group of groupBy(stale, (row) => companyOf.get(row.personId) ?? '').values()) {
          await cases.updateMany(
            group.map((row) => row.id),
            { companyId: companyOf.get(group[0].personId) ?? null },
          );
        }
      });
    }
  }
  if (operation === 'deleted') {
    await errors.run('contacts of cases', async () =>
      clearReferences(
        cases,
        'personId',
        await stillDeletedIds(
          people,
          events.map((event) => event.recordId),
        ),
      ),
    );
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.person,
  name: 'platform-person-helpdesk-tickets',
  description: "Brings a contact's company to its work cases, and clears a deleted contact from its cases.",
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'person.*', batchMode: true },
});
