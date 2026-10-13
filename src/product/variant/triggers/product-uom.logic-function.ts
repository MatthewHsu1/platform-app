import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { putBackBarcodeClash } from 'src/product/variant/barcode-check';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { forEachReportingErrors } from 'src/shared/triggers/retry-on-conflict';

type PackagingEventRecord = {
  id: string;
  barcode: string | null;
  updatedBy?: { source?: string | null } | null;
};

const handler = async (
  payload: DatabaseEventBatchPayload<ObjectRecordEvent<PackagingEventRecord>>,
) => {
  const { operation, events } = readEvents<PackagingEventRecord>(payload);

  if (operation !== 'created' && operation !== 'updated') {
    return {};
  }

  await forEachReportingErrors(events, async (event) => {
    const before = 'before' in event.properties ? event.properties.before : undefined;
    const after = 'after' in event.properties ? event.properties.after : undefined;

    if (after === undefined || isApplicationWrite(after) || before?.barcode === after.barcode) {
      return;
    }
    await putBackBarcodeClash({
      owner: 'productUom',
      recordId: event.recordId,
      savedBarcode: after.barcode,
      previousBarcode: before?.barcode ?? null,
    });
  });

  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productUom,
  name: 'platform-product-uom',
  description: 'Refuses a packaging barcode that another variant or packaging already uses.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productUom.*', batchMode: true },
});
