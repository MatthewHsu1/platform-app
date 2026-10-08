import { productComboItems } from 'src/product/combo/combo-records';
import { variantDetailsFor } from 'src/product/utils/plan-variant-details.util';
import { combinationKey, type VariantPlan } from 'src/product/utils/plan-variants.util';
import { variantCombinations } from 'src/product/utils/variant-plan-input.util';
import {
  productProducts,
  variantCombinationLinks,
} from 'src/product/variant/product-records';
import { type TemplateState } from 'src/product/variant/template-state.type';

export type AppliedVariantPlan = Extract<VariantPlan, { kind: 'apply' }>;

// A variant is archived, not deleted, only when a row with a restricting
// reference points at it. Vendor prices, pricelist rules and packaging
// barcodes cascade, so they never block the delete; combo items do.
export const variantIdsInUse = async (variantIds: string[]): Promise<Set<string>> => {
  if (variantIds.length === 0) {
    return new Set();
  }
  const items = await productComboItems.find<{ productId: string | null }>(
    { productId: { in: variantIds } },
    'productId',
  );

  return new Set(items.flatMap((item) => item.productId ?? []));
};

const linkRows = (variantId: string, templateAttributeValueIds: string[]) =>
  templateAttributeValueIds.map((templateAttributeValueId) => ({
    productProductId: variantId,
    productTemplateAttributeValueId: templateAttributeValueId,
  }));

export const hasVariantWork = (plan: AppliedVariantPlan) =>
  plan.create.length > 0 ||
  plan.activate.length > 0 ||
  plan.extend.length > 0 ||
  plan.removeOrArchive.length > 0;

// Order matters for the unique (product, combination) index and for T13: a
// deleted variant comes back before its combination changes, and new
// variants exist before old ones go.
export const applyVariantPlan = async (
  state: TemplateState,
  plan: AppliedVariantPlan,
  variantsInUse: Set<string>,
) => {
  const variantById = new Map(state.variants.map((variant) => [variant.id, variant]));
  const combinations = variantCombinations(state);
  const activating = new Set(plan.activate);
  const extending = plan.extend.filter(
    ({ variantId }) =>
      variantById.get(variantId)?.deletedAt === null || activating.has(variantId),
  );

  await productProducts.restoreMany(
    plan.activate.filter((variantId) => variantById.get(variantId)?.deletedAt !== null),
  );
  await variantCombinationLinks.createMany(
    extending.flatMap(({ variantId, templateAttributeValueIds }) => {
      const current = new Set(combinations.get(variantId) ?? []);
      return linkRows(
        variantId,
        templateAttributeValueIds.filter((id) => !current.has(id)),
      );
    }),
  );
  for (const { variantId, templateAttributeValueIds } of extending) {
    await productProducts.update(variantId, {
      combinationIndices: combinationKey(templateAttributeValueIds),
    });
  }
  await productProducts.updateMany(
    plan.activate.filter((variantId) => variantById.get(variantId)?.active !== true),
    { active: true },
  );

  const variantDetails = variantDetailsFor(state);
  const createdIds = await productProducts.createMany(
    plan.create.map((combination) => ({
      productTmplId: state.template.id,
      active: state.template.active,
      ...variantDetails(combination, null),
    })),
  );
  await variantCombinationLinks.createMany(
    createdIds.flatMap((variantId, index) => linkRows(variantId, plan.create[index])),
  );

  const removing = plan.removeOrArchive.flatMap((variantId) => {
    const variant = variantById.get(variantId);
    return variant === undefined || variant.deletedAt !== null ? [] : [variant];
  });
  await productProducts.softDeleteMany(
    removing.filter((variant) => !variantsInUse.has(variant.id)).map((variant) => variant.id),
  );
  await productProducts.updateMany(
    removing
      .filter((variant) => variantsInUse.has(variant.id) && variant.active)
      .map((variant) => variant.id),
    { active: false },
  );

  // The combo items of every variant deleted or archived are removed,
  // so the combo stays valid; the next pass deletes an archived variant
  // nothing holds any more.
  if (removing.length === 0) {
    return;
  }
  const removedItems = await productComboItems.find<{ id: string }>(
    { productId: { in: removing.map((variant) => variant.id) } },
    'id',
  );
  await productComboItems.softDeleteMany(removedItems.map((item) => item.id));
};
