import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { productPricelistItems } from 'src/product/pricelist/pricelist-records';
import { PRODUCT_PRICING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { findLoopThroughRule } from 'src/product/utils/pricelist-price.util';
import {
  planPricelistItem,
  type PricelistItemValues,
  pricelistItemName,
} from 'src/product/utils/plan-pricelist-item.util';
import { productProducts, productTemplates } from 'src/product/variant/product-records';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { addNote, putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { sameValue } from 'src/shared/utils/same-value.util';

type ItemEventRecord = PricelistItemValues & {
  id: string;
  updatedBy?: { source?: string | null } | null;
};

type StoredItem = PricelistItemValues & {
  id: string;
  name: string | null;
  pricelistId: string | null;
  categ: { name: string | null; completeName: string | null } | null;
};

const SELECTION =
  'id name pricelistId appliedOn categId productTmplId productId base basePricelistId computePrice priceDiscount priceMarkup categ { name completeName }';

const PERCENT_FIELDS = ['priceDiscount', 'priceMarkup'] as const;
const WATCHED_FIELDS = [...PERCENT_FIELDS, 'appliedOn', 'basePricelistId'] as const;

const valuesOf = (item: StoredItem): PricelistItemValues => ({
  appliedOn: item.appliedOn,
  categId: item.categId,
  productTmplId: item.productTmplId,
  productId: item.productId,
  base: item.base,
  basePricelistId: item.basePricelistId,
  computePrice: item.computePrice,
  priceDiscount: item.priceDiscount ?? 0,
  priceMarkup: item.priceMarkup ?? 0,
});

// A new row has no before: the percent the user filled counts as changed, so
// a markup typed on its own still sets the discount.
const changedFieldsOf = (before: ItemEventRecord | undefined, after: ItemEventRecord) =>
  before === undefined
    ? PERCENT_FIELDS.filter((field) => (after[field] ?? 0) !== 0)
    : WATCHED_FIELDS.filter((field) => !sameValue(before[field], after[field]));

const readNames = async (item: PricelistItemValues) => {
  const [templates, variants] = await Promise.all([
    item.productTmplId === null
      ? []
      : productTemplates.find<{ name: string | null }>({ id: { eq: item.productTmplId } }, 'name'),
    item.productId === null
      ? []
      : productProducts.find<{ name: string | null }>({ id: { eq: item.productId } }, 'name'),
  ]);

  return { productName: templates[0]?.name ?? null, variantName: variants[0]?.name ?? null };
};

const templateIdOf = async (variantId: string | null) => {
  if (variantId === null) {
    return null;
  }
  const [variant] = await productProducts.find<{ productTmplId: string | null }>(
    { id: { eq: variantId } },
    'productTmplId',
  );

  return variant?.productTmplId ?? null;
};

// A pricelist loop is refused. Twenty has saved, so the
// rule goes back to its old base, or is deleted when it was just created.
const undoLoop = async ({
  item,
  effective,
  before,
}: {
  item: StoredItem;
  effective: PricelistItemValues;
  before: ItemEventRecord | undefined;
}) => {
  if (effective.base !== 'PRICELIST' || effective.basePricelistId === null || item.pricelistId === null) {
    return false;
  }
  const others = await productPricelistItems.find<{
    id: string;
    pricelistId: string | null;
    basePricelistId: string | null;
  }>({ base: { eq: 'PRICELIST' }, id: { neq: item.id } }, 'id pricelistId basePricelistId');
  const loop = findLoopThroughRule({
    own: { pricelistId: item.pricelistId, basePricelistId: effective.basePricelistId },
    others: others.flatMap((other) =>
      other.pricelistId === null || other.basePricelistId === null
        ? []
        : [{ pricelistId: other.pricelistId, basePricelistId: other.basePricelistId }],
    ),
  });

  if (loop === null) {
    return false;
  }
  const [stored] = await productPricelistItems.find<{ basePricelistId: string | null }>(
    { id: { eq: item.id } },
    'basePricelistId',
  );
  if (stored === undefined || stored.basePricelistId !== effective.basePricelistId) {
    return false;
  }
  const reason = 'This would make pricelists based on each other.';

  if (before === undefined) {
    await productPricelistItems.destroyMany([item.id]);
    await addNote({
      objectSingular: 'productPricelist',
      recordId: item.pricelistId,
      title: 'Rule removed',
      body: `A new rule was removed. ${reason}`,
    });
  } else {
    await putBack({
      objectSingular: 'productPricelistItem',
      objectPlural: 'productPricelistItems',
      recordId: item.id,
      data: { basePricelistId: before.basePricelistId ?? null, base: before.base ?? 'LIST_PRICE' },
      reason,
    });
  }
  return true;
};

const settleItem = async ({
  recordId,
  created,
  before,
  after,
}: {
  recordId: string;
  created: boolean;
  before: ItemEventRecord | undefined;
  after: ItemEventRecord;
}) => {
  const [item] = await productPricelistItems.find<StoredItem>({ id: { eq: recordId } }, SELECTION);

  if (item === undefined) {
    return;
  }
  const stored = valuesOf(item);
  const plan = planPricelistItem({
    created,
    changedFields: changedFieldsOf(before, after),
    item: stored,
    templateIdOfProduct: await templateIdOf(stored.productId),
  });
  const effective = { ...stored, ...plan };
  const names = await readNames(effective);
  const name = pricelistItemName({
    appliedOn: effective.appliedOn,
    // A category made a moment ago has no full name yet.
    categoryName: item.categ?.completeName ?? item.categ?.name ?? null,
    ...names,
  });

  await productPricelistItems.update(recordId, {
    ...plan,
    ...(name === item.name ? {} : { name }),
  });
  await undoLoop({ item, effective, before });
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<ItemEventRecord>>) => {
  const { operation, events } = readEvents<ItemEventRecord>(payload);

  if (operation !== 'created' && operation !== 'updated') {
    return {};
  }
  const errors = errorCollector();

  for (const event of events) {
    const before = 'before' in event.properties ? event.properties.before : undefined;
    const after = 'after' in event.properties ? event.properties.after : undefined;

    if (after === undefined || isApplicationWrite(after)) {
      continue;
    }
    await errors.run(event.recordId, () =>
      settleItem({ recordId: event.recordId, created: operation === 'created', before, after }),
    );
  }
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_PRICING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productPricelistItem,
  name: 'platform-product-pricelist-item',
  description:
    'Fills the targets and level of a pricelist rule, keeps markup and discount equal, names the rule, and undoes a base pricelist that makes pricelists based on each other.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productPricelistItem.*', batchMode: true },
});
