import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { comboSaleRefusal } from 'src/product/combo/combo-sale-check';
import { productComboLinks } from 'src/product/combo/combo-records';
import { PRODUCT_COMBO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { addNote } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type LinkEventRecord = {
  id: string;
  productTemplateId: string | null;
  updatedBy?: { source?: string | null } | null;
};

// A removed link must lose its row, so a soft-deleted link is destroyed.
// A link made by staff that breaks the sale check is destroyed too: the
// create is rolled back.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LinkEventRecord>>) => {
  const { operation, events } = readEvents<LinkEventRecord>(payload);
  const errors = errorCollector();

  if (operation === 'deleted') {
    await errors.run('destroy', () => productComboLinks.destroySoftDeleted(events.map((event) => event.recordId)));
  }
  if (operation === 'created') {
    for (const event of events) {
      const after = 'after' in event.properties ? event.properties.after : undefined;

      if (after === undefined || after.productTemplateId === null || isApplicationWrite(after)) {
        continue;
      }
      const templateId = after.productTemplateId;

      await errors.run(event.recordId, async () => {
        const reason = await comboSaleRefusal(templateId);

        if (reason !== null) {
          await productComboLinks.destroyMany([event.recordId]);
          await addNote({
            objectSingular: 'productTemplate',
            recordId: templateId,
            title: 'Combo choice removed',
            body: `The combo choice was removed again. ${reason}`,
          });
        }
      });
    }
  }
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_COMBO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productComboProductTemplateRel,
  name: 'platform-product-combo-product-template-rel',
  description:
    'Removes a combo link for good once it is deleted, and refuses a link that gives a sellable combo a product that cannot be sold.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'productComboProductTemplateRel.*', batchMode: true },
});
