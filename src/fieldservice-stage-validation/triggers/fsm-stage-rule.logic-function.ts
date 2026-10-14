import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_STAGE_VALIDATION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-universal-identifiers.constant';
import { STAGE_VALIDATION_MESSAGES } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-messages.constant';
import { syncStageValidationRules } from 'src/fieldservice-stage-validation/sync-stage-validation-rules';
import { addNote } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

// Any save or delete of a rule row brings the validation rules of the service order to all the rows. A field
// named on a saved row that cannot be checked is told on that row.
const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const errors = errorCollector();

  await errors.run('validation rules', async () => {
    const { enabled, skipped } = await syncStageValidationRules();
    const saved = new Set(payload.events.map((event) => event.recordId));

    for (const rowId of saved) {
      const names = skipped.filter((entry) => entry.rowId === rowId);

      if (enabled && names.length > 0) {
        await addNote({
          objectSingular: 'fsmStageRule',
          recordId: rowId,
          title: 'Fields left out',
          body: await localizedReason(payload.events[0], STAGE_VALIDATION_MESSAGES.fieldsLeftOut, {
            fields: names.map((entry) => `${entry.name} (${entry.reason})`).join(', '),
          }),
        });
      }
    }
  });
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STAGE_VALIDATION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stageRule,
  name: 'platform-fsm-stage-rule',
  description: 'Keeps the validation rules of the service order in line with the stage rules.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmStageRule.*', batchMode: true },
});
