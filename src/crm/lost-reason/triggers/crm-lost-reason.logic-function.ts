import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { CRM_LOST_REASON_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { leadExistsWhere } from 'src/crm/lead/lead-exists-where';
import { makeRunLostReasonTrigger } from 'src/crm/lost-reason/run-lost-reason-trigger';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readEvents } from 'src/shared/triggers/batch-events';
import { restoreIfStillDeleted } from 'src/shared/triggers/put-back';

const REASONS = { objectSingular: 'crmLostReason', objectPlural: 'crmLostReasons' } as const;

const runLostReasonTrigger = makeRunLostReasonTrigger({
  reasonIdsUsedByLeads: async (reasonIds) => {
    const used = new Set<string>();

    for (const reasonId of reasonIds) {
      if (await leadExistsWhere({ lostReasonId: { eq: reasonId } })) {
        used.add(reasonId);
      }
    }
    return used;
  },
  restoreReason: (reasonId, reason) => restoreIfStillDeleted({ ...REASONS, recordId: reasonId, reason }),
  memberLocale: readMemberLocale,
  translate: (locale, message) => translate(locale, message),
});

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);

  await runLostReasonTrigger({ operation, events });

  return {};
};

export default defineLogicFunction({
  universalIdentifier: CRM_LOST_REASON_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-crm-lost-reason',
  description: 'Puts back a deleted lost reason that leads still use.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'crmLostReason.*', batchMode: true },
});
