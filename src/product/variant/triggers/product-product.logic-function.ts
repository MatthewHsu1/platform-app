import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { groupTemplateIds } from 'src/product/utils/group-template-ids.util';
import { refusedHandMadeVariants } from 'src/product/utils/hand-made-variants.util';
import { planVariants } from 'src/product/utils/plan-variants.util';
import { staffEditOf } from 'src/product/utils/plan-template-variant-sync.util';
import { buildVariantPlanInput, hasDynamicLine } from 'src/product/utils/variant-plan-input.util';
import { variantsRefusedForDelete } from 'src/product/utils/combo-guards.util';
import { variantHolders } from 'src/product/variant/apply-variant-plan';
import { productPricelistItems } from 'src/product/pricelist/pricelist-records';
import { productSupplierinfos } from 'src/product/supplierinfo/supplierinfo-records';
import { packagingBarcodes, productProducts, productTemplates } from 'src/product/variant/product-records';
import { putBackBarcodeClash } from 'src/product/variant/barcode-check';
import { readTemplateState } from 'src/product/variant/read-template-state';
import { reconcileTemplates } from 'src/product/variant/reconcile-variants';
import { refreshDerivedNames } from 'src/product/template/derived-names';
import { isApplicationWrite, isStaffChange } from 'src/shared/triggers/actor';
import { addNote, restoreWithNote } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector, forEachReportingErrors } from 'src/shared/triggers/retry-on-conflict';
import { RESTRICT_DELETE_MESSAGE } from 'src/stock/stock-messages';
import { type Currency } from 'src/product/variant/types/currency.type';

type VariantEventRecord = {
  id: string;
  name: string | null;
  productTmplId: string | null;
  active: boolean;
  defaultCode: string | null;
  barcode: string | null;
  standardPrice: Currency | null;
  weight: number | null;
  volume: number | null;
  updatedAt?: string;
  updatedBy?: { source?: string | null } | null;
};

// The product is deleted with its last variant, unless the product
// makes variants on demand (a DYNAMIC attribute).
const deleteProductWithoutVariants = async (templateId: string) => {
  const state = await readTemplateState(templateId);

  if (state === null || state.variants.some((variant) => variant.deletedAt === null)) {
    return;
  }
  const hasDynamic = hasDynamicLine(buildVariantPlanInput(state).lines);

  if (!hasDynamic) {
    await productTemplates.softDelete(templateId);
  }
};

// A staff archive or unarchive follows to the product. The variant cleanup
// archives with a plain write, which leaves the product alone, so the app's
// writes are skipped.
const syncProductActive = async (templateId: string) => {
  const [template] = await productTemplates.find<{ id: string; active: boolean }>(
    { id: { eq: templateId } },
    'id active',
  );

  if (template === undefined) {
    return;
  }
  const active = await productProducts.find<{ id: string }>(
    { productTmplId: { eq: templateId }, active: { eq: true } },
    'id',
  );

  if (template.active && active.length === 0) {
    await productTemplates.update(templateId, { active: false });
  } else if (!template.active && active.length > 0) {
    await productTemplates.update(templateId, { active: true });
  }
};

const variantTagLinks = records('productTagProductProductRel', 'productTagProductProductRels');

// Vendor prices, pricelist rules, packaging barcodes and tag links go with a
// deleted variant. A soft delete cascades nothing in
// Twenty.
const deleteRowsOfVariants = async (variantIds: string[]) => {
  if (variantIds.length === 0) {
    return;
  }
  const errors = errorCollector();
  const owners = [
    [productSupplierinfos, 'productId'],
    [productPricelistItems, 'productId'],
    [packagingBarcodes, 'productId'],
    [variantTagLinks, 'productProductId'],
  ] as const;

  for (const [owner, field] of owners) {
    await errors.run(owner.objectPlural, async () => {
      const rows = await owner.find<{ id: string }>({ [field]: { in: variantIds } }, 'id');
      await owner.softDeleteMany(rows.map((row) => row.id));
    });
  }
  errors.throwIfAny();
};

// A variant a combo item or a lot/serial number holds cannot be deleted,
// whoever asks. Twenty has deleted it, so it comes back. The app itself never
// deletes a held variant: it archives one instead.
const restoreHeldVariants = async (events: { recordId: string }[]) => {
  const deletedIds = events.map((event) => event.recordId);
  const { comboItems, lots } = await variantHolders(deletedIds);
  const refused = variantsRefusedForDelete({
    deletedIds,
    heldIds: new Set([...comboItems, ...lots]),
  });

  for (const recordId of refused) {
    await restoreWithNote({
      objectSingular: 'productProduct',
      objectPlural: 'productProducts',
      recordId,
      reason: comboItems.has(recordId)
        ? 'A combo option holds this variant, so it cannot be deleted.'
        : RESTRICT_DELETE_MESSAGE,
    });
  }
  return new Set(refused);
};

const HAND_MADE_REASON =
  'A variant made by hand was removed. Each variant is one combination of the product attribute values, made by the app; this one repeated a combination or had none.';

// A variant must be a new combination (unique product +
// combination), so the create never happened: the row is destroyed.
// The product is then reconciled at once, which also settles a restored one.
const settleStaffVariants = async (templateId: string, createdIds: string[]) => {
  const state = await readTemplateState(templateId);

  if (state === null) {
    return;
  }
  const refused = refusedHandMadeVariants({
    plan: planVariants(buildVariantPlanInput(state)),
    handMadeIds: createdIds,
  });

  if (refused.length > 0) {
    await productProducts.destroyMany(refused);
    await addNote({
      objectSingular: 'productTemplate',
      recordId: templateId,
      title: 'Variant removed',
      body: HAND_MADE_REASON,
    });
  }
  await reconcileTemplates([templateId], { variants: true });
};

const handler = async (
  payload: DatabaseEventBatchPayload<ObjectRecordEvent<VariantEventRecord>>,
) => {
  const { operation, events } = readEvents<VariantEventRecord>(payload);

  if (operation === 'deleted') {
    const deleteErrors = errorCollector();
    let kept = new Set<string>();

    await deleteErrors.run('held variants', async () => {
      kept = await restoreHeldVariants(events);
    });
    const removed = events.filter((event) => !kept.has(event.recordId));

    await deleteErrors.run('rows of the variants', () =>
      deleteRowsOfVariants(removed.map((event) => event.recordId)),
    );
    await deleteErrors.run('products', () =>
      forEachReportingErrors(
        groupTemplateIds(removed, (event) =>
          'before' in event.properties ? event.properties.before?.productTmplId : null,
        ),
        deleteProductWithoutVariants,
      ),
    );
    deleteErrors.throwIfAny();
    return {};
  }

  if (operation === 'restored') {
    const restored = events.filter((event) => isStaffChange(operation, event, undefined));

    await forEachReportingErrors(
      groupTemplateIds(restored, (event) =>
        'after' in event.properties ? event.properties.after?.productTmplId : null,
      ),
      (templateId) => settleStaffVariants(templateId, []),
    );
    return {};
  }

  if (operation !== 'updated' && operation !== 'created') {
    return {};
  }

  const errors = errorCollector();
  const putBackIds = new Set<string>();

  // A barcode must be unique. The put-back is an app write, so
  // the edit below is built as if the refused barcode was never saved.
  for (const event of events) {
    const before = 'before' in event.properties ? event.properties.before : undefined;
    const after = 'after' in event.properties ? event.properties.after : undefined;

    if (after === undefined || isApplicationWrite(after) || before?.barcode === after.barcode) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const undone = await putBackBarcodeClash({
        owner: 'productProduct',
        recordId: event.recordId,
        savedBarcode: after.barcode,
        previousBarcode: before?.barcode ?? null,
      });

      if (undone) {
        putBackIds.add(event.recordId);
      }
    });
  }

  if (operation === 'created') {
    const handMade = events.flatMap((event) => {
      const after = 'after' in event.properties ? event.properties.after : undefined;
      return after === undefined || isApplicationWrite(after) ? [] : [after];
    });

    for (const templateId of groupTemplateIds(handMade, (row) => row.productTmplId)) {
      await errors.run(templateId, () =>
        settleStaffVariants(
          templateId,
          handMade.filter((row) => row.productTmplId === templateId).map((row) => row.id),
        ),
      );
    }
  }

  if (operation === 'updated') {
    const renamedIds = events.flatMap((event) =>
      'before' in event.properties &&
      'after' in event.properties &&
      event.properties.before?.name !== event.properties.after?.name
        ? [event.recordId]
        : [],
    );

    if (renamedIds.length > 0) {
      await errors.run('names', () => refreshDerivedNames({ variantIds: renamedIds }));
    }

    const changes = events.flatMap((event) =>
      'before' in event.properties &&
      'after' in event.properties &&
      event.properties.before !== undefined &&
      event.properties.after !== undefined
        ? [
            {
              before: event.properties.before,
              after: putBackIds.has(event.recordId)
                ? { ...event.properties.after, barcode: event.properties.before.barcode }
                : event.properties.after,
            },
          ]
        : [],
    );

    await errors.run('sync', () =>
      forEachReportingErrors(
        groupTemplateIds(changes, ({ after }) => after.productTmplId),
        async (templateId) => {
          const own = changes.filter(({ after }) => after.productTmplId === templateId);
          const edit = staffEditOf('variant', own);
          const staffChangedActive = own.some(
            ({ before, after }) => before.active !== after.active && !isApplicationWrite(after),
          );

          if (staffChangedActive) {
            await syncProductActive(templateId);
          }
          if (edit !== null) {
            await reconcileTemplates([templateId], { edit });
          }
        },
      ),
    );
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productProduct,
  name: 'platform-product-product',
  description:
    "Copies a single variant's fields to its product, archives or unarchives the product with its variants, deletes a product left with no variant, refuses a barcode another variant or packaging uses and a variant made by hand, and renames what is named after the variant.",
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'productProduct.*', batchMode: true },
});
