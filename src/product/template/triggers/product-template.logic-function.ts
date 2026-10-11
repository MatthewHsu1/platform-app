import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { productComboLinks } from 'src/product/combo/combo-records';
import { PRODUCT_TYPE } from 'src/product/product-options.constant';
import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { comboSaleRefusal } from 'src/product/combo/combo-sale-check';
import { deleteProductRows, restoreHeldProducts } from 'src/product/template/delete-product-rows';
import { refreshDerivedNames } from 'src/product/template/derived-names';
import { groupTemplateIds } from 'src/product/utils/group-template-ids.util';
import { staffEditOf, SYNCED_FIELDS } from 'src/product/utils/plan-template-variant-sync.util';
import { productProducts, productTemplates, uoms } from 'src/product/variant/product-records';
import { putBackBarcodeClash } from 'src/product/variant/barcode-check';
import { reconcileTemplates } from 'src/product/variant/reconcile-variants';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { UOM_SEED_KEY_UNIT } from 'src/uom/uom-universal-identifiers.constant';
import { sameValue } from 'src/shared/utils/same-value.util';
import { type Currency } from 'src/product/variant/types/currency.type';

type TemplateEventRecord = {
  id: string;
  name: string | null;
  active: boolean;
  productType?: string | null;
  saleOk?: boolean;
  uomId: string | null;
  listPrice: Currency | null;
  defaultCode: string | null;
  barcode: string | null;
  standardPrice: Currency | null;
  weight: number | null;
  volume: number | null;
  updatedAt?: string;
  updatedBy?: { source?: string | null } | null;
};

const NAME_FIELDS = ['name', 'listPrice', 'defaultCode'] as const;

// A product saved without a unit gets Units, the unit a count of items is in.
const fillDefaultUnit = async (templateIds: string[]) => {
  if (templateIds.length === 0) {
    return;
  }
  const [unit] = await uoms.find<{ id: string }>({ seedKey: { eq: UOM_SEED_KEY_UNIT } }, 'id');

  if (unit === undefined) {
    return;
  }
  await productTemplates.updateMany(templateIds, { uomId: unit.id });
};

// Clears the combo choices of a product that stops being a combo.
const clearComboChoices = async (templateIds: string[]) => {
  if (templateIds.length === 0) {
    return;
  }
  const links = await productComboLinks.find<{ id: string }>(
    { productTemplateId: { in: templateIds } },
    'id',
  );
  await productComboLinks.softDeleteMany(links.map((link) => link.id));
};

// The save is refused when a sellable combo holds a
// product that cannot be sold; the old values go back.
const putBackSaleCombo = async (before: TemplateEventRecord, after: TemplateEventRecord) => {
  const reason = await comboSaleRefusal(after.id);

  if (reason !== null) {
    await putBack({
      objectSingular: 'productTemplate',
      objectPlural: 'productTemplates',
      recordId: after.id,
      data: { productType: before.productType ?? null, saleOk: before.saleOk ?? false },
      reason,
    });
  }
};

// A barcode typed on the product: it is written to the
// single variant, where a clash is refused.
const putBackProductBarcode = (
  templateId: string,
  savedBarcode: string | null,
  previousBarcode: string | null,
) =>
  putBackBarcodeClash({ owner: 'productTemplate', recordId: templateId, savedBarcode, previousBarcode });

const activeVariants = (templateId: string) =>
  productProducts.find<{ id: string }>(
    { productTmplId: { eq: templateId }, active: { eq: true } },
    'id',
  );

const reconcileChanged = async (
  templateId: string,
  changes: { before: TemplateEventRecord; after: TemplateEventRecord }[],
) => {
  const own = changes.filter(({ after }) => after.id === templateId);
  const last = own[own.length - 1].after;
  const activeChanged = own.some(({ before, after }) => before.active !== after.active);
  const edit = staffEditOf('template', own);
  const namesChanged = own.some(({ before, after }) =>
    NAME_FIELDS.some((field) => !sameValue(before[field], after[field])),
  );
  let variants = false;

  // A product write archives every variant with the product, and
  // reconciles variants on unarchive when none is active.
  if (activeChanged && !last.active) {
    await productProducts.updateMany(
      (await activeVariants(templateId)).map((variant) => variant.id),
      { active: false },
    );
  } else if (activeChanged && last.active) {
    variants = (await activeVariants(templateId)).length === 0;
  }

  if (variants || edit !== null || namesChanged) {
    await reconcileTemplates([templateId], { variants, edit: edit ?? undefined });
  }
};

const handler = async (
  payload: DatabaseEventBatchPayload<ObjectRecordEvent<TemplateEventRecord>>,
) => {
  const { operation, events } = readEvents<TemplateEventRecord>(payload);

  if (operation === 'created') {
    const created = events.flatMap((event) =>
      'after' in event.properties && event.properties.after !== undefined
        ? [event.properties.after]
        : [],
    );
    const createErrors = errorCollector();

    await createErrors.run('unit', () =>
      fillDefaultUnit(created.filter((row) => row.uomId === null).map((row) => row.id)),
    );
    for (const row of created.filter((row) => !isApplicationWrite(row))) {
      await createErrors.run(row.id, () => putBackProductBarcode(row.id, row.barcode, null));
    }
    await reconcileTemplates(
      groupTemplateIds(created, (row) => row.id),
      { variants: true, sync: { source: 'template', fields: SYNCED_FIELDS } },
      createErrors,
    );
    createErrors.throwIfAny();
    return {};
  }

  // A product back from the trash gets its variants back, as an unarchived one does.
  if (operation === 'restored') {
    await reconcileTemplates(
      groupTemplateIds(events, (event) => event.recordId),
      { variants: true },
    );
    return {};
  }

  if (operation === 'deleted') {
    const deletedIds = events.map((event) => event.recordId);
    const kept = await restoreHeldProducts(deletedIds);

    await deleteProductRows(deletedIds.filter((id) => !kept.has(id)));
    return {};
  }

  if (operation !== 'updated') {
    return {};
  }

  const saved = events.flatMap((event) =>
    'before' in event.properties &&
    'after' in event.properties &&
    event.properties.before !== undefined &&
    event.properties.after !== undefined
      ? [{ before: event.properties.before, after: event.properties.after }]
      : [],
  );
  const errors = errorCollector();
  const barcodePutBackIds = new Set<string>();

  for (const { before, after } of saved) {
    if (isApplicationWrite(after) || before.barcode === after.barcode) {
      continue;
    }
    await errors.run(after.id, async () => {
      if (await putBackProductBarcode(after.id, after.barcode, before.barcode)) {
        barcodePutBackIds.add(after.id);
      }
    });
  }
  // The put-back is an app write, so the edit copied to the variant below is
  // built as if the refused barcode was never saved.
  const changes = saved.map(({ before, after }) =>
    barcodePutBackIds.has(after.id) ? { before, after: { ...after, barcode: before.barcode } } : { before, after },
  );

  await fillDefaultUnit(
    changes
      .filter(({ before, after }) => after.uomId === null && before.uomId !== null)
      .map(({ after }) => after.id),
  );

  // The app's put-back is not a staff write: it must not clear combo choices.
  await errors.run('combo choices', () =>
    clearComboChoices(
      changes
        .filter(
          ({ before, after }) =>
            before.productType !== after.productType &&
            after.productType !== PRODUCT_TYPE.COMBO &&
            !isApplicationWrite(after),
        )
        .map(({ after }) => after.id),
    ),
  );

  for (const { before, after } of changes) {
    const becameSellableCombo =
      after.productType === PRODUCT_TYPE.COMBO &&
      after.saleOk === true &&
      (before.productType !== PRODUCT_TYPE.COMBO || before.saleOk !== true);

    if (becameSellableCombo && !isApplicationWrite(after)) {
      await errors.run(after.id, () => putBackSaleCombo(before, after));
    }
  }

  for (const templateId of groupTemplateIds(changes, ({ after }) => after.id)) {
    await errors.run(templateId, () => reconcileChanged(templateId, changes));
  }

  const renamedIds = changes
    .filter(({ before, after }) => before.name !== after.name)
    .map(({ after }) => after.id);

  if (renamedIds.length > 0) {
    await errors.run('names', () => refreshDerivedNames({ templateIds: renamedIds }));
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productTemplate,
  name: 'platform-product-template',
  description:
    'Gives a new product its unit and variants, copies its fields to a single variant, archives variants with the product, refuses a barcode another variant or packaging uses, and renames what is named after the product.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'productTemplate.*', batchMode: true },
});
