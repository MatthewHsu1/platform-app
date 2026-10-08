import {
  planEditSync,
  planTemplateVariantSync,
  type SyncedField,
  type SyncValues,
  syncValuesOf,
} from 'src/product/utils/plan-template-variant-sync.util';
import { productProducts, productTemplates } from 'src/product/variant/product-records';
import {
  type Currency,
  type TemplateState,
} from 'src/product/variant/template-state.type';
import { DEFAULT_CURRENCY_CODE } from 'src/shared/currency.constant';

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

// T3 on product create and after T2. Returns whether it wrote anything, so
// the caller reads the rows again.
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

export type StaffEdit = {
  source: 'template' | 'variant';
  edits: Partial<Record<SyncedField, { before: unknown; after: unknown }>>;
  savedAt: string;
};

// T3 for a staff save on one side (R22).
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
