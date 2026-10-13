import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type ProductTemplateEventRecord } from 'src/stock/product/types/product-template-event-record.type';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { productTemplates } from 'src/stock/stock-records';
import { planStorableFlag } from 'src/stock/utils/plan-product-stock-rules.util';

// Only goods are tracked.
export const handleStorableFlag = async (
  events: ObjectRecordEvent<ProductTemplateEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created' && operation !== 'updated') {
    return;
  }
  for (const event of events) {
    const after = eventAfter(event);
    const before = eventBefore(event);

    if (after === undefined || isApplicationWrite(after)) {
      continue;
    }
    if (operation === 'updated' && before?.productType === after.productType && before.isStorable === after.isStorable) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const [current] = await productTemplates.find<{ id: string; productType: string; isStorable: boolean }>(
        { id: { eq: event.recordId } },
        'id productType isStorable',
      );
      const data = current === undefined ? null : planStorableFlag(current);

      if (data !== null) {
        await productTemplates.update(event.recordId, data);
      }
    });
  }
};
