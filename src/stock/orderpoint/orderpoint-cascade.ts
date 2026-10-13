import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { restoreCascaded } from 'src/shared/triggers/cascade-restore';
import { type Records } from 'src/shared/triggers/records';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { groupBy } from 'src/shared/utils/group-by.util';
import { enqueueOrderpointRecompute } from 'src/stock/orderpoint/enqueue-orderpoint-recompute';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { planCategoryOnOrderpoints } from 'src/stock/orderpoint/utils/plan-category-on-orderpoints.util';
import { planVariantActiveOnOrderpoints } from 'src/stock/orderpoint/utils/plan-variant-active-on-orderpoints.util';
import { eventChangedFields, restoredParents } from 'src/stock/stock-event-helpers';
import { productProducts, productTemplates } from 'src/stock/stock-records';

// The rules of a trashed product, location or warehouse go to the trash with
// it and come back with it. A rule staff deleted was destroyed, so the trash
// holds only rules that went with a parent.
export const cascadeOrderpointsWithParent =
  (parents: Records, field: 'productId' | 'locationId' | 'warehouseId') =>
  async (events: ObjectRecordEvent<object>[], operation: RecordOperation, errors: ErrorCollector) => {
    const children = [{ of: stockWarehouseOrderpoints, field }];

    if (operation === 'deleted') {
      await errors.run('reordering rules', () =>
        cascadeDelete({ parents, parentIds: events.map((event) => event.recordId), children }),
      );
    }
    if (operation === 'restored') {
      await errors.run('reordering rules', () => restoreCascaded({ parents: restoredParents(events as ObjectRecordEvent<{ deletedAt?: string | null }>[]), children }));
    }
  };

const updateByValue = async (writes: { id: string; data: Record<string, unknown> }[]) => {
  for (const [, group] of groupBy(writes, (write) => JSON.stringify(write.data))) {
    await stockWarehouseOrderpoints.updateMany(
      group.map((write) => write.id),
      group[0].data,
    );
  }
};

// Archiving a variant archives its reordering rules, and unarchiving it
// brings them back, whoever made the change.
export const carryVariantActiveToOrderpoints = async (
  events: ObjectRecordEvent<object>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const variantIds = (events as ObjectRecordEvent<{ active?: boolean | null }>[])
    .filter((event) => eventChangedFields(event, ['active']).length > 0)
    .map((event) => event.recordId);

  if (variantIds.length === 0) {
    return;
  }
  await errors.run('reordering rules', async () => {
    const variants = await productProducts.find<{ id: string; active: boolean | null }>({ id: { in: variantIds } }, 'id active');
    const rules = await stockWarehouseOrderpoints.find<{ id: string; productId: string; active: boolean | null }>(
      { productId: { in: variants.map((variant) => variant.id) } },
      'id productId active',
    );

    await updateByValue(
      planVariantActiveOnOrderpoints({ variants, rules }).map(({ id, active }) => ({ id, data: { active } })),
    );
  });
};

// The rules of a product's variants keep a copy of its category for filters,
// and the category's routes can change which rules supply them.
export const copyCategoryToOrderpoints = async (
  events: ObjectRecordEvent<object>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const templateIds = (events as ObjectRecordEvent<{ categId?: string | null }>[])
    .filter((event) => eventChangedFields(event, ['categId']).length > 0)
    .map((event) => event.recordId);

  if (templateIds.length === 0) {
    return;
  }
  await errors.run('reordering rules', async () => {
    const templates = await productTemplates.find<{ id: string; categId: string | null }>({ id: { in: templateIds } }, 'id categId');
    const variants = await productProducts.find<{ id: string; productTmplId: string }>(
      { productTmplId: { in: templates.map((template) => template.id) } },
      'id productTmplId',
    );
    const rules = await stockWarehouseOrderpoints.find<{
      id: string;
      productId: string;
      productCategoryId: string | null;
      active: boolean | null;
    }>({ productId: { in: variants.map((variant) => variant.id) } }, 'id productId productCategoryId active');

    await updateByValue(
      planCategoryOnOrderpoints({ templates, variants, rules }).map(({ id, productCategoryId }) => ({
        id,
        data: { productCategoryId },
      })),
    );
    const active = rules.filter((rule) => rule.active === true).map((rule) => rule.id);

    if (active.length > 0) {
      await enqueueOrderpointRecompute(active);
    }
  });
};
