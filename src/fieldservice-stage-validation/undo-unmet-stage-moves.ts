import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { ORDER_STAGE } from 'src/fieldservice/fieldservice-options.constant';
import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { checkStageRequirements } from 'src/fieldservice-stage-validation/check-stage-requirements';
import { STAGE_VALIDATION_MESSAGES } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-messages.constant';
import { readOrderObject } from 'src/fieldservice-stage-validation/read-order-object';
import { validationRuleApi } from 'src/fieldservice-stage-validation/validation-rule-api';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const stageOf = (record: Record<string, unknown> | undefined) => (typeof record?.stage === 'string' && record.stage !== '' ? record.stage : null);

const sideOf = (event: RawEvent, side: 'before' | 'after') => (side in event.properties ? (event.properties as Record<string, Record<string, unknown>>)[side] : undefined);

// A staff move of an order into a stage, or a staff create in a stage other than the first, whose fields are not
// all set comes back with a note: a move to the stage it left, a new order to New. This is the fallback of the
// validation rules (which Twenty applies itself, in the save): when the workspace has them off it checks every
// field; when they are on it checks only the lists of link rows (equipment, extra workers), which a rule cannot
// read. A move the app made (its own buttons check first) and a save that leaves the stage as it was are not
// checked. The stored order is read again, so the check sees what it holds now.
export const undoUnmetStageMoves = async (operation: 'created' | 'updated', events: RawEvent[]) => {
  const moves = events.filter(
    (event) => !isApplicationWrite(sideOf(event, 'after')) && (operation === 'created' ? stageOf(sideOf(event, 'after')) !== ORDER_STAGE.NEW : updatedFieldsOf(event).includes('stage')),
  );

  if (moves.length === 0) {
    return;
  }
  const ids = [...new Set(moves.map((event) => event.recordId))];
  const rows = await fsmOrders.find<Record<string, unknown>>({ id: { in: ids } }, 'id stage');
  const entered = rows.flatMap((row) => (stageOf(row) === null ? [] : [{ orderId: String(row.id), stage: stageOf(row) as string }]));
  const { objectId } = await readOrderObject();
  const plans = await checkStageRequirements(entered, { linksOnly: await validationRuleApi.isEnabled(objectId) });
  const errors = errorCollector();

  for (const { orderId, stage } of entered) {
    const saves = moves.filter((event) => event.recordId === orderId);
    const previous = operation === 'created' ? ORDER_STAGE.NEW : stageOf(sideOf(saves[0], 'before'));
    const plan = plans.get(orderId);

    if (plan?.kind === 'missing' && previous !== stage) {
      await errors.run(orderId, async () =>
        putBack({
          objectSingular: 'fsmOrder',
          objectPlural: 'fsmOrders',
          recordId: orderId,
          data: { stage: previous ?? ORDER_STAGE.NEW },
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
