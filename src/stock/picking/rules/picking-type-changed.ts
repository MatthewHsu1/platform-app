import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { nextNumber } from 'src/base/sequence/next-number';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readPicking, readPickingType } from 'src/stock/picking/read-picking';
import { propagatePickingChanges } from 'src/stock/picking/rules/picking-propagation';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockMoves, stockPickings } from 'src/stock/stock-records';
import { PICKING_TYPE_CHANGE_MESSAGE, planTypeChange } from 'src/stock/utils/plan-picking-rules.util';
import { planPickingTypeCodes } from 'src/stock/utils/plan-picking-type-codes.util';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';

const OBJECT = { objectSingular: 'stockPicking', objectPlural: 'stockPickings' } as const;

export const handlePickingTypeChanged = async (
  events: ObjectRecordEvent<PickingEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }

  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    if (
      before === undefined ||
      after === undefined ||
      !isStaffEvent(operation, event) ||
      !eventChangedFields(event, ['pickingTypeId']).includes('pickingTypeId')
    ) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const picking = await readPicking(event.recordId);

      if (picking === undefined || picking.pickingTypeId !== after.pickingTypeId) {
        return;
      }
      const newType = await readPickingType(after.pickingTypeId);

      if (newType === undefined) {
        // A transfer left without an operation type shows no type of operation.
        for (const { pickingTypeCode } of planPickingTypeCodes({ pickings: [picking], codeByTypeId: new Map() })) {
          await stockPickings.update(picking.id, { pickingTypeCode });
        }
        return;
      }
      const moves = await stockMoves.find<{ id: string; pickingTypeId: string | null }>(
        { pickingId: { eq: picking.id } },
        'id pickingTypeId',
      );
      const closed = planTypeChange({ state: picking.state, newType, nextName: null, moveIds: moves });

      if (closed.kind === 'refuse') {
        await putBackForEvent({
          ...OBJECT,
          event,
          data: { pickingTypeId: before.pickingTypeId },
          message: PICKING_TYPE_CHANGE_MESSAGE,
        });
        return;
      }
      const nextName = newType.referenceSequenceId === null ? null : await nextNumber(newType.referenceSequenceId);
      const plan = planTypeChange({ state: picking.state, newType, nextName, moveIds: moves });

      if (plan.kind !== 'apply') {
        return;
      }
      await stockPickings.update(picking.id, plan.picking);
      for (const move of plan.moves) {
        await stockMoves.update(move.id, { pickingTypeId: move.pickingTypeId });
      }
      await propagatePickingChanges(picking.id, {
        ...(plan.picking.locationId !== picking.locationId && plan.picking.locationId !== null
          ? { locationId: plan.picking.locationId as string }
          : {}),
        ...(plan.picking.locationDestId !== picking.locationDestId && plan.picking.locationDestId !== null
          ? { locationDestId: plan.picking.locationDestId as string }
          : {}),
      });
    });
  }
};
