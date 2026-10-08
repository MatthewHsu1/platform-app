import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { resolveCategories } from 'src/product/utils/category-paths.util';
import { PRODUCT_CATEGORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { productPricelistItems } from 'src/product/pricelist/pricelist-records';
import { refreshDerivedNames } from 'src/product/template/derived-names';
import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { putBack } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type CategoryRecord = {
  id: string;
  name: string;
  parentId: string | null;
  completeName: string | null;
  parentPath: string | null;
};

const SELECTION = 'id name parentId completeName parentPath';
const categories = records('productCategory', 'productCategories');

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<CategoryRecord>>) => {
  const { operation, events } = readEvents<CategoryRecord>(payload);

  const errors = errorCollector();

  // The child categories (and so their children) and the pricelist rules of
  // a deleted category go with it.
  if (operation === 'deleted') {
    await errors.run('children', () =>
      cascadeDelete({
        parents: categories,
        parentIds: events.map((event) => event.recordId),
        children: [
          { of: categories, field: 'parentId' },
          { of: productPricelistItems, field: 'categId' },
        ],
      }),
    );
    errors.throwIfAny();
    return {};
  }

  if (operation !== 'created' && operation !== 'updated' && operation !== 'restored') {
    return {};
  }

  const all = await categories.find<CategoryRecord>({}, SELECTION);
  const { resolved, cycles } = resolveCategories(all);
  const cyclic = new Set(cycles);
  const storedParent = new Map(all.map((row) => [row.id, row.parentId]));
  let undone = false;

  for (const event of events) {
    const before = 'before' in event.properties ? event.properties.before : undefined;

    // The put-back write fires this trigger again, and by then the stored parent is already the old one.
    if (
      cyclic.has(event.recordId) &&
      before !== undefined &&
      storedParent.get(event.recordId) !== before.parentId
    ) {
      await errors.run(event.recordId, () =>
        putBack({
          objectSingular: 'productCategory',
          objectPlural: 'productCategories',
          recordId: event.recordId,
          data: { parentId: before.parentId },
          reason: 'A category cannot be its own parent, also not through other categories.',
        }),
      );
      undone = true;
    }
  }

  // The undo writes fire this trigger again, and that pass fills the names and paths.
  if (undone) {
    errors.throwIfAny();
    return {};
  }

  const renamedIds: string[] = [];

  for (const row of all) {
    const category = resolved.get(row.id);

    if (category === undefined) {
      continue;
    }

    const data: Record<string, unknown> = {};

    if (row.completeName !== category.completeName) {
      data.completeName = category.completeName;
      renamedIds.push(row.id);
    }
    if (row.parentPath !== category.parentPath) {
      data.parentPath = category.parentPath;
    }

    await errors.run(row.id, () => categories.update(row.id, data));
  }
  if (renamedIds.length > 0) {
    await errors.run('rule names', () => refreshDerivedNames({ categoryIds: renamedIds }));
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_CATEGORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-product-category',
  description:
    'Keeps each category full name and path right, refuses cycles, renames its pricelist rules, and deletes the child categories and pricelist rules of a deleted category.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productCategory.*', batchMode: true },
});
