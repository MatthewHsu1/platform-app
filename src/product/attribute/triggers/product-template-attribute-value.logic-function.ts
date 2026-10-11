import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { groupTemplateIds } from 'src/product/utils/group-template-ids.util';
import { templateAttributeValues } from 'src/product/variant/product-records';
import { reconcileTemplates } from 'src/product/variant/reconcile-variants';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { sameValue } from 'src/shared/utils/same-value.util';
import { type Currency } from 'src/product/variant/types/currency.type';

type TemplateAttributeValueEventRecord = {
  id: string;
  productTmplId: string | null;
  productAttributeValueId: string | null;
  priceExtra: Currency | null;
  updatedBy?: { source?: string | null } | null;
};

const VALUE_REASON = 'A product attribute value keeps its value.';

// A product attribute value's value cannot change.
const putBackValue = async (
  before: TemplateAttributeValueEventRecord,
  after: TemplateAttributeValueEventRecord,
) => {
  if (
    before.productAttributeValueId === after.productAttributeValueId ||
    isApplicationWrite(after)
  ) {
    return;
  }
  const [stored] = await templateAttributeValues.find<{ productAttributeValueId: string | null }>(
    { id: { eq: after.id } },
    'productAttributeValueId',
  );

  if (stored === undefined || stored.productAttributeValueId === before.productAttributeValueId) {
    return;
  }
  await putBack({
    objectSingular: 'productTemplateAttributeValue',
    objectPlural: 'productTemplateAttributeValues',
    recordId: after.id,
    data: { productAttributeValueId: before.productAttributeValueId },
    reason: VALUE_REASON,
  });
};

const handler = async (
  payload: DatabaseEventBatchPayload<ObjectRecordEvent<TemplateAttributeValueEventRecord>>,
) => {
  const { operation, events } = readEvents<TemplateAttributeValueEventRecord>(payload);

  const errors = errorCollector();

  if (operation === 'deleted') {
    await reconcileTemplates(
      groupTemplateIds(events, (event) =>
        'before' in event.properties ? event.properties.before?.productTmplId : null,
      ),
      { variants: true },
      errors,
    );
    errors.throwIfAny();
    return {};
  }

  if (operation !== 'updated') {
    return {};
  }

  const repriced: typeof events = [];

  for (const event of events) {
    const { before, after } = event.properties as {
      before: TemplateAttributeValueEventRecord;
      after: TemplateAttributeValueEventRecord;
    };

    await errors.run(event.recordId, () => putBackValue(before, after));
    if (!sameValue(before.priceExtra, after.priceExtra)) {
      repriced.push(event);
    }
  }

  await reconcileTemplates(
    groupTemplateIds(repriced, (event) =>
      'after' in event.properties ? event.properties.after?.productTmplId : null,
    ),
    {},
    errors,
  );

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier:
    PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productTemplateAttributeValue,
  name: 'platform-product-template-attribute-value',
  description:
    'Reprices variants when an extra price changes, reconciles variants when a value is deleted, and refuses changing a value.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'productTemplateAttributeValue.*', batchMode: true },
});
