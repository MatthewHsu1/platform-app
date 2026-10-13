import { planEditSync, planTemplateVariantSync, syncValuesOf } from 'src/product/utils/plan-template-variant-sync.util';
import { productProducts, productTemplates } from 'src/product/variant/product-records';
import { DEFAULT_CURRENCY_CODE } from 'src/shared/currency.constant';
import { type SyncedField } from 'src/product/utils/types/synced-field.type';
import { type SyncValues } from 'src/product/utils/types/sync-values.type';
import { type Currency } from 'src/product/variant/types/currency.type';
import { type TemplateState } from 'src/product/variant/types/template-state.type';
import { type StaffEdit } from 'src/product/variant/types/staff-edit.type';

const toWriteData = (data: Partial<SyncValues>, standardPrice: Currency | null) => {
  const { standardPrice: amountMicros, ...rest } = data;

  return 'standardPrice' in data
    ? {
        ...rest,
        standardPrice: {
          amountMicros: amountMicros ?? 0,
          currencyCode: standardPrice?.currencyCode ?? DEFAULT_CURRENCY_CODE,
        },
      }
    : rest;
};

const applySync = async (
  state: TemplateState,
  plan: { template: Partial<SyncValues>; variant: { id: string; data: Partial<SyncValues> } | null },
) => {
  await productTemplates.update(
    state.template.id,
    toWriteData(plan.template, state.template.standardPrice),
  );

  if (plan.variant !== null) {
    const variantId = plan.variant.id;
    const variant = state.variants.find((row) => row.id === variantId);
    await productProducts.update(
      variantId,
      toWriteData(plan.variant.data, variant?.standardPrice ?? null),
    );
  }

  return Object.keys(plan.template).length > 0 || plan.variant !== null;
};

const liveVariants = (state: TemplateState) =>
  state.variants.filter((variant) => variant.deletedAt === null);

// Copies synced fields between product and variant on product create and after
// variants are reconciled. Returns whether it wrote anything, so the caller reads the rows again.
export const syncTemplateVariantFields = (
  state: TemplateState,
  source: 'template' | 'variant',
  changedFields: SyncedField[],
) =>
  applySync(
    state,
    planTemplateVariantSync({
      source,
      changedFields,
      template: syncValuesOf(state.template),
      variants: liveVariants(state).map((variant) => ({
        id: variant.id,
        active: variant.active,
        ...syncValuesOf(variant),
      })),
    }),
  );

// A staff save on one side wins on the fields it changed.
export const syncStaffEdit = (state: TemplateState, edit: StaffEdit) =>
  applySync(
    state,
    planEditSync({
      source: edit.source,
      edits: edit.edits,
      sourceSavedAt: edit.savedAt,
      template: { ...syncValuesOf(state.template), updatedAt: state.template.updatedAt ?? '' },
      variants: liveVariants(state).map((variant) => ({
        id: variant.id,
        active: variant.active,
        ...syncValuesOf(variant),
        updatedAt: variant.updatedAt ?? '',
      })),
    }),
  );
