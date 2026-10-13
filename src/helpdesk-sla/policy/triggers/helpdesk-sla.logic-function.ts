import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { HELPDESK_SLA_MESSAGES } from 'src/helpdesk-sla/helpdesk-sla-messages.constant';
import { HELPDESK_SLA_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { POLICY_DELETE_RULES } from 'src/helpdesk-sla/policy/policy-delete-rules';
import { helpdeskSlas, helpdeskTicketSlas } from 'src/helpdesk-sla/sla-records';
import { readEvents } from 'src/shared/triggers/batch-events';
import { restoreIfStillDeleted } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';

// A policy that service level rows still name stays: its delete is put back with a note, whoever deleted it.
// Editing a policy changes no row.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();

  if (operation === 'deleted') {
    const ids = events.map((event) => event.recordId);
    const used = new Set(
      (await helpdeskTicketSlas.find<{ slaId: string }>({ slaId: { in: ids } }, 'slaId')).map((row) => row.slaId),
    );

    for (const policyId of ids.filter((id) => used.has(id))) {
      const event = events.find((candidate) => candidate.recordId === policyId);

      await errors.run(policyId, async () =>
        restoreIfStillDeleted({
          objectSingular: helpdeskSlas.objectSingular,
          objectPlural: helpdeskSlas.objectPlural,
          recordId: policyId,
          reason: await localizedReason(event ?? {}, HELPDESK_SLA_MESSAGES.policyInUse),
        }),
      );
    }
    const allowed = ids.filter((id) => !used.has(id));

    if (allowed.length > 0) {
      await errors.run('delete rules', () => applyDeleteRules(helpdeskSlas, POLICY_DELETE_RULES, allowed));
    }
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_SLA_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.policy,
  name: 'platform-helpdesk-sla',
  description: 'Puts back a deleted SLA policy that work cases still use, and removes the lists of a policy that goes.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'helpdeskSla.*', batchMode: true },
});
