import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { compareAndSet } from 'src/shared/compare-and-set';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type QuantEventRecord } from 'src/stock/quant/types/quant-event-record.type';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { stockQuants } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { planCountTyped } from 'src/stock/utils/plan-quant-count.util';

const ATTEMPTS = 3;

// The count fields share the row with the stock level the quant engine writes under compare-and-set, so this
// write goes through compare-and-set too: read again and retry on a clash.
export const handleCountTyped = async (
  events: ObjectRecordEvent<QuantEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const { productUnitDigits } = readStockSettings();

  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    if (before === undefined || after === undefined || isApplicationWrite(after)) {
      continue;
    }
    if (before.inventoryQuantity === after.inventoryQuantity) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
        const [quant] = await stockQuants.find<{
          id: string;
          quantity: number;
          version: number;
          inventoryQuantity: number | null;
        }>({ id: { eq: event.recordId } }, 'id quantity version inventoryQuantity');

        if (quant === undefined) {
          return;
        }
        const written = await compareAndSet({
          objectSingular: 'stockQuant',
          objectPlural: 'stockQuants',
          id: quant.id,
          version: quant.version,
          data: {
            ...planCountTyped({
              inventoryQuantity: quant.inventoryQuantity,
              quantity: quant.quantity,
              digits: productUnitDigits,
            }),
            version: quant.version + 1,
          },
        });

        if (written) {
          return;
        }
      }
      throw new Error(`The count of stock row ${event.recordId} kept changing; its difference was not updated.`);
    });
  }
};
