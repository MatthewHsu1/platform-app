import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { ORDER_STAGE } from 'src/fieldservice/fieldservice-options.constant';
import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { STAGE_RULE_VALUES_SELECTION } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-options.constant';
import { STAGE_VALIDATION_MESSAGES } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-messages.constant';
import { loadStageRules } from 'src/fieldservice-stage-validation/load-stage-rules';
import { planStageRequirements } from 'src/fieldservice-stage-validation/utils/plan-stage-requirements.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const stageOf = (record: Record<string, unknown> | undefined) => (typeof record?.stage === 'string' && record.stage !== '' ? record.stage : null);

// A staff move of an order into a stage whose listed fields are not all set is undone with a note. A new order,
// a move the app made (its own buttons check first) and a save that leaves the stage as it was are not checked.
// The stored order is read again, so the check sees what it holds now.
export const undoUnmetStageMoves = async (events: RawEvent[]) => {
  const moves = events.filter((event) => {
    const after = 'after' in event.properties ? event.properties.after : undefined;

    return updatedFieldsOf(event).includes('stage') && !isApplicationWrite(after);
  });

  if (moves.length === 0) {
    return;
  }
  const ids = [...new Set(moves.map((event) => event.recordId))];
  const rows = await fsmOrders.find<Record<string, unknown>>({ id: { in: ids } }, `id stage ${STAGE_RULE_VALUES_SELECTION}`);
  const rules = await loadStageRules([...new Set(rows.flatMap((row) => stageOf(row) ?? []))]);
  const errors = errorCollector();

  for (const row of rows) {
    const saves = moves.filter((event) => event.recordId === row.id);
    const first = saves[0];
    const before = 'before' in first.properties ? first.properties.before : undefined;
    const plan = planStageRequirements({ stage: stageOf(row), rules, values: row });

    if (plan.kind === 'missing' && stageOf(before) !== stageOf(row)) {
      await errors.run(String(row.id), async () =>
        putBack({
          objectSingular: 'fsmOrder',
          objectPlural: 'fsmOrders',
          recordId: String(row.id),
          data: { stage: stageOf(before) ?? ORDER_STAGE.NEW },
          reason: await localizedReason(saves[saves.length - 1], STAGE_VALIDATION_MESSAGES.fieldMissing, {
            stage: plan.stageName,
            field: plan.fieldLabel,
          }),
        }),
      );
    }
  }
  errors.throwIfAny();
};
