import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { findMany } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { irSequences, productTemplates } from 'src/stock/stock-records';
import { IR_SEQUENCE_SERIAL_PREFIX_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

type SequenceRecord = { id: string; prefix: string | null };

// A product shows its lot sequence's prefix as its custom lot/serial prefix.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<SequenceRecord>>) => {
  const { operation, events } = readEvents<SequenceRecord>(payload);

  if (operation !== 'updated') {
    return {};
  }
  const changedIds = events.flatMap((event) => {
    const before = eventBefore(event);
    const after = eventAfter(event);

    return before !== undefined && after !== undefined && (before.prefix ?? '') !== (after.prefix ?? '')
      ? [event.recordId]
      : [];
  });

  if (changedIds.length === 0) {
    return {};
  }
  const { sequences, templates } = await findMany<{
    sequences: SequenceRecord[];
    templates: { id: string; lotSequenceId: string | null; serialPrefixFormat: string | null }[];
  }>({
    sequences: { of: irSequences, filter: { id: { in: changedIds } }, selection: 'id prefix' },
    templates: {
      of: productTemplates,
      filter: { lotSequenceId: { in: changedIds } },
      selection: 'id lotSequenceId serialPrefixFormat',
    },
  });
  const errors = errorCollector();

  for (const sequence of sequences) {
    const prefix = sequence.prefix ?? '';
    const stale = templates.filter(
      (template) => template.lotSequenceId === sequence.id && (template.serialPrefixFormat ?? '') !== prefix,
    );

    await errors.run(sequence.id, () =>
      productTemplates.updateMany(
        stale.map((template) => template.id),
        { serialPrefixFormat: prefix === '' ? null : prefix },
      ),
    );
  }
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: IR_SEQUENCE_SERIAL_PREFIX_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-ir-sequence-serial-prefix',
  description: "Shows a lot sequence's new prefix on the products that use it.",
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'irSequence.*', batchMode: true },
});
