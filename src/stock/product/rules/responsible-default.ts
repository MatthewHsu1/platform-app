import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type ProductTemplateEventRecord } from 'src/stock/product/types/product-template-event-record.type';
import { creatorMemberId, eventAfter } from 'src/stock/stock-event-helpers';
import { productTemplates } from 'src/stock/stock-records';

// The creator is the responsible user until staff pick another.
export const handleResponsibleDefault = async (
  events: ObjectRecordEvent<ProductTemplateEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created') {
    return;
  }
  for (const event of events) {
    const after = eventAfter(event);
    const memberId = creatorMemberId(event, after);

    if (after === undefined || isApplicationWrite(after) || after.responsibleId !== null || memberId === null) {
      continue;
    }
    await errors.run(event.recordId, () => productTemplates.update(event.recordId, { responsibleId: memberId }));
  }
};
