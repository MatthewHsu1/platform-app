import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type PickingTypeEventRecord } from 'src/stock/picking-type/types/picking-type-event-record.type';
import { eventAfter, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { irSequences, stockPickingTypes, stockWarehouses } from 'src/stock/stock-records';
import { PICKING_TYPE_ROW, SEQUENCE_ROW, WAREHOUSE_ROW } from 'src/stock/stock-rows';
import { planTypeSequenceRename } from 'src/stock/utils/plan-picking-type-rules.util';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';
import { type SequenceRow } from 'src/stock/types/sequence-row.type';
import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';

// Old transfer names keep their prefix; only the next numbers change.
export const handlePickingTypeSequence = async (
  events: ObjectRecordEvent<PickingTypeEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }

  for (const event of events) {
    const after = eventAfter(event);

    if (
      after === undefined ||
      !isStaffEvent(operation, event) ||
      !eventChangedFields(event, ['sequenceCode']).includes('sequenceCode')
    ) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const [type] = await stockPickingTypes.find<PickingTypeRow>({ id: { eq: event.recordId } }, PICKING_TYPE_ROW);

      if (type === undefined || !type.sequenceCode || type.sequenceCode !== after.sequenceCode || type.referenceSequenceId === null) {
        return;
      }
      const [sequence] = await irSequences.find<SequenceRow>({ id: { eq: type.referenceSequenceId } }, SEQUENCE_ROW);
      const [warehouse] =
        type.warehouseId === null
          ? []
          : await stockWarehouses.find<WarehouseRow>({ id: { eq: type.warehouseId } }, WAREHOUSE_ROW);
      const data = planTypeSequenceRename({
        sequenceCode: type.sequenceCode,
        warehouse: warehouse ?? null,
        sequence: sequence ?? null,
      });

      if (data !== null && sequence !== undefined) {
        await irSequences.update(sequence.id, data);
      }
    });
  }
};
