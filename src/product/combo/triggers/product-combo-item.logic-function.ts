import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { productComboItems } from 'src/product/combo/combo-records';
import { productProducts, productTemplates } from 'src/product/variant/product-records';
import { PRODUCT_COMBO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { comboItemRefusal } from 'src/product/utils/combo-split.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { addNote, putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type ItemEventRecord = {
  id: string;
  comboId: string | null;
  productId: string | null;
  updatedBy?: { source?: string | null } | null;
};

type StoredItem = {
  id: string;
  name: string | null;
  comboId: string | null;
  productId: string | null;
  createdAt: string;
};

type StoredVariant = { id: string; name: string | null; productTmplId: string | null };

type SiblingItem = { id: string; comboId: string | null; productId: string | null; createdAt: string };

const SELECTION = 'id name comboId productId createdAt';

const isOlder = (other: SiblingItem, item: StoredItem) =>
  other.createdAt < item.createdAt || (other.createdAt === item.createdAt && other.id < item.id);

// Two items made in one batch must not remove each other: for a new item only
// an older one counts as the original. An edited item is refused whenever
// another item already holds the product.
const hasDuplicate = (item: StoredItem, siblings: SiblingItem[], created: boolean) =>
  siblings.some(
    (other) =>
      other.id !== item.id &&
      other.comboId === item.comboId &&
      other.productId === item.productId &&
      (!created || isOlder(other, item)),
  );

const settleItem = async ({
  recordId,
  before,
  created,
  item,
  siblings,
  variant,
  productType,
}: {
  recordId: string;
  before: ItemEventRecord | undefined;
  created: boolean;
  item: StoredItem;
  siblings: SiblingItem[];
  variant: StoredVariant | undefined;
  productType: string | null;
}) => {
  const refusal = comboItemRefusal({
    itemProductType: productType ?? '',
    duplicateInChoice: hasDuplicate(item, siblings, created),
  });

  if (refusal !== null && created) {
    // The create is rolled back, so the item never exists.
    await productComboItems.destroyMany([recordId]);
    if (item.comboId !== null) {
      await addNote({
        objectSingular: 'productCombo',
        recordId: item.comboId,
        title: 'Option removed',
        body: `A new option was removed. ${refusal}`,
      });
    }
    return;
  }
  if (refusal !== null && before !== undefined) {
    await putBack({
      objectSingular: 'productComboItem',
      objectPlural: 'productComboItems',
      recordId,
      data: { comboId: before.comboId, productId: before.productId },
      reason: refusal,
    });
    return;
  }

  const name = variant?.name ?? '';

  if (name !== (item.name ?? '')) {
    await productComboItems.update(recordId, { name });
  }
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<ItemEventRecord>>) => {
  const { operation, events } = readEvents<ItemEventRecord>(payload);

  if (operation !== 'created' && operation !== 'updated') {
    return {};
  }
  const changed = events.flatMap((event) => {
    const before = 'before' in event.properties ? event.properties.before : undefined;
    const after = 'after' in event.properties ? event.properties.after : undefined;
    const moved =
      operation === 'created' ||
      before?.comboId !== after?.comboId ||
      before?.productId !== after?.productId;

    return after === undefined || isApplicationWrite(after) || !moved
      ? []
      : [{ recordId: event.recordId, before }];
  });

  if (changed.length === 0) {
    return {};
  }
  const items = await productComboItems.find<StoredItem>(
    { id: { in: changed.map(({ recordId }) => recordId) } },
    SELECTION,
  );
  const comboIds = [...new Set(items.flatMap((item) => item.comboId ?? []))];
  const siblings =
    comboIds.length === 0
      ? []
      : await productComboItems.find<SiblingItem>(
          { comboId: { in: comboIds } },
          'id comboId productId createdAt',
        );
  // Two plain reads: a nested read of the variant's product comes back empty.
  const variantIds = [...new Set(items.flatMap((item) => item.productId ?? []))];
  const variants =
    variantIds.length === 0
      ? []
      : await productProducts.find<StoredVariant>({ id: { in: variantIds } }, 'id name productTmplId');
  const templateIds = [...new Set(variants.flatMap((variant) => variant.productTmplId ?? []))];
  const templates =
    templateIds.length === 0
      ? []
      : await productTemplates.find<{ id: string; productType: string | null }>(
          { id: { in: templateIds } },
          'id productType',
        );
  const errors = errorCollector();

  for (const { recordId, before } of changed) {
    const item = items.find((candidate) => candidate.id === recordId);

    if (item !== undefined) {
      const variant = variants.find((candidate) => candidate.id === item.productId);
      const productType = templates.find((template) => template.id === variant?.productTmplId)?.productType;

      await errors.run(recordId, () =>
        settleItem({
          recordId,
          before,
          created: operation === 'created',
          item,
          siblings,
          variant,
          productType: productType ?? null,
        }),
      );
    }
  }
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_COMBO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productComboItem,
  name: 'platform-product-combo-item',
  description:
    'Names a combo option after its variant, and removes an option that is a combo product or repeats a product in its choice.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productComboItem.*', batchMode: true },
});
