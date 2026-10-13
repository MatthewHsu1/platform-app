import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { HELPDESK_SLA_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { refreshCaseSlaSummary } from 'src/helpdesk-sla/sla-engine-bound';
import { readEvents } from 'src/shared/triggers/batch-events';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';

type RowRecord = { id: string; ticketId: string | null };

// Every change of a row, whoever made it, brings the case's deadline and expired flag in step with its rows.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<RowRecord>>) => {
  const { events } = readEvents<RowRecord>(payload);
  const caseIds = new Set<string>();

  for (const event of events) {
    for (const row of [eventBefore(event), eventAfter(event)]) {
      if (row?.ticketId !== null && row?.ticketId !== undefined) {
        caseIds.add(row.ticketId);
      }
    }
  }
  if (caseIds.size > 0) {
    await refreshCaseSlaSummary([...caseIds]);
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_SLA_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.row,
  name: 'platform-helpdesk-ticket-sla',
  description: "Keeps each work case's SLA deadline and expired flag right after its service level rows change.",
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'helpdeskTicketSla.*', batchMode: true },
});
