import { leavesNoVariant, noVariantLeftNote } from 'src/product/utils/leaves-no-variant.util';
import { planVariantDetails } from 'src/product/utils/plan-variant-details.util';
import { planVariants } from 'src/product/utils/plan-variants.util';
import { fieldsNotEdited, type SyncedField } from 'src/product/utils/plan-template-variant-sync.util';
import {
  buildVariantPlanInput,
  hasDynamicLine,
  missingCombinationLinks,
} from 'src/product/utils/variant-plan-input.util';
import {
  applyVariantPlan,
  hasVariantWork,
  variantIdsInUse,
} from 'src/product/variant/apply-variant-plan';
import {
  attributeLines,
  exclusions,
  productProducts,
  templateAttributeValues,
  variantCombinationLinks,
} from 'src/product/variant/product-records';
import { readTemplateState } from 'src/product/variant/read-template-state';
import {
  type StaffEdit,
  syncStaffEdit,
  syncTemplateVariantFields,
} from 'src/product/variant/sync-template-variant-fields';
import { type TemplateState } from 'src/product/variant/template-state.type';
import { type UndoResult } from 'src/product/variant/undo-changes';
import { addNote } from 'src/shared/triggers/put-back';
import {
  type ErrorCollector,
  forEachReportingErrors,
  retryOnConflict,
} from 'src/shared/triggers/retry-on-conflict';

export type ReconcileOptions = {
  // T2: create, restore, archive and delete variants.
  variants?: boolean;
  // T3: which side wins for which fields. After T2 the product follows its
  // variant; on product create the product's values go to its new variant.
  sync?: { source: 'template' | 'variant'; fields: SyncedField[] };
  // T3 for a staff save of synced fields on the product or its variant.
  edit?: StaffEdit;
  // A save that would leave the product without any variant is refused.
  // Twenty has saved, so
  // the trigger undoes the change that started this run.
  undoChange?: (templateId: string) => Promise<UndoResult>;
};

const NO_VARIANT_LEFT_UNDONE =
  'This change would leave the product without any variant, so it was undone.';
const NO_VARIANT_LEFT_KEPT =
  'This change would leave the product without any variant, so its variants were not changed. Undo the change or add a value that makes a variant.';

const refuse = (templateId: string, reason: string, title = 'Variants not changed') =>
  addNote({ objectSingular: 'productTemplate', recordId: templateId, title, body: reason });

// One request per changed row: Twenty's batch upsert would bring back a row
// that a parallel run has just deleted.
const applyVariantDetails = async (state: TemplateState) => {
  const plan = planVariantDetails(state);

  for (const { id, data } of plan.variants) {
    await productProducts.update(id, data);
  }
  for (const { id, data } of plan.lines) {
    await attributeLines.update(id, data);
  }
  for (const { id, data } of plan.templateAttributeValues) {
    await templateAttributeValues.update(id, data);
  }
  for (const { id, data } of plan.exclusions) {
    await exclusions.update(id, data);
  }
};

const reconcilePass = async (
  templateId: string,
  options: ReconcileOptions,
): Promise<'stop' | 'variantsChanged' | 'done'> => {
  let state = await readTemplateState(templateId);

  if (state === null) {
    return 'stop';
  }

  await variantCombinationLinks.createMany(missingCombinationLinks(state));

  // A staff edit is written through to the single variant, an
  // archived one too, before the write reconciles the variants.
  if (options.edit !== undefined && (await syncStaffEdit(state, options.edit))) {
    state = await readTemplateState(templateId);
    if (state === null) {
      return 'stop';
    }
  }

  let sync = options.sync;
  let variantsChanged = false;

  if (options.variants === true) {
    const input = buildVariantPlanInput(state);
    const plan = planVariants(input);

    if (plan.kind === 'refuse') {
      await refuse(templateId, plan.reason);
      return 'stop';
    }

    const variantsInUse = await variantIdsInUse(plan.removeOrArchive);
    const hasDynamic = hasDynamicLine(input.lines);

    if (leavesNoVariant({ variants: state.variants, plan, variantsInUse, hasDynamic })) {
      const note = noVariantLeftNote(
        options.undoChange === undefined ? { attempted: 0, undone: 0 } : await options.undoChange(templateId),
      );

      if (note === 'undone') {
        await refuse(templateId, NO_VARIANT_LEFT_UNDONE, 'Change undone');
      } else if (note === 'kept') {
        await refuse(templateId, NO_VARIANT_LEFT_KEPT);
      }
      return 'stop';
    }

    // The product takes its values from its variant only when the variants
    // changed; otherwise a staff edit waiting in the queue would be overwritten.
    if (hasVariantWork(plan)) {
      await applyVariantPlan(state, plan, variantsInUse);
      variantsChanged = true;
      state = await readTemplateState(templateId);
      if (state === null) {
        return 'stop';
      }
      sync = sync ?? { source: 'variant', fields: fieldsNotEdited(options.edit) };
    }
  }

  if (sync !== undefined && (await syncTemplateVariantFields(state, sync.source, sync.fields))) {
    state = await readTemplateState(templateId);
    if (state === null) {
      return 'stop';
    }
  }

  await applyVariantDetails(state);
  return variantsChanged ? 'variantsChanged' : 'done';
};

const MAX_PASSES = 2;

// Runs that overlap on one product can each read the rows before the other
// wrote. A run that changed variants reads once more and fixes what it finds,
// so the last run to change variants leaves them right.
const reconcileTemplate = async (templateId: string, options: ReconcileOptions) => {
  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    const outcome = await reconcilePass(
      templateId,
      pass === 1 ? options : { variants: options.variants },
    );

    if (outcome !== 'variantsChanged') {
      return;
    }
  }
};

// T2 + T3 + T4 + names, one product at a time so two products never mix.
// With a collector the caller goes on and reports at its end; without one a
// failure is reported once every product has had its turn.
export const reconcileTemplates = async (
  templateIds: string[],
  options: ReconcileOptions = {},
  errors?: ErrorCollector,
) => {
  const run = (templateId: string) => retryOnConflict(() => reconcileTemplate(templateId, options));

  if (errors === undefined) {
    await forEachReportingErrors(templateIds, run);
    return;
  }
  for (const templateId of templateIds) {
    await errors.run(templateId, () => run(templateId));
  }
};
