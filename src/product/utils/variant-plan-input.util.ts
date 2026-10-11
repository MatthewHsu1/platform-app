import { type TemplateState } from 'src/product/variant/types/template-state.type';
import { type ExistingVariant } from 'src/product/utils/types/existing-variant.type';
import { type VariantExclusion } from 'src/product/utils/types/variant-exclusion.type';
import { type VariantLine } from 'src/product/utils/types/variant-line.type';


const indexedIds = (combinationIndices: string | null) =>
  (combinationIndices ?? '').split(',').filter((id) => id !== '');

// A variant's combination is its link rows plus its combinationIndices: a run
// cut off between writing one and the other leaves the rest in the other.
export const variantCombinations = (state: TemplateState) => {
  const byVariant = new Map<string, string[]>(
    state.variants.map((variant) => [variant.id, indexedIds(variant.combinationIndices)]),
  );

  for (const { productProductId, productTemplateAttributeValueId } of state.combinations) {
    if (productProductId === null || productTemplateAttributeValueId === null) {
      continue;
    }
    const ids = byVariant.get(productProductId) ?? [];
    if (!ids.includes(productTemplateAttributeValueId)) {
      byVariant.set(productProductId, [...ids, productTemplateAttributeValueId]);
    }
  }

  return byVariant;
};

// Link rows a cut-off run did not write.
export const missingCombinationLinks = (state: TemplateState) => {
  const linked = new Set(
    state.combinations.map(
      (link) => `${link.productProductId}:${link.productTemplateAttributeValueId}`,
    ),
  );

  return state.variants.flatMap((variant) =>
    indexedIds(variant.combinationIndices)
      .filter((id) => !linked.has(`${variant.id}:${id}`))
      .map((id) => ({ productProductId: variant.id, productTemplateAttributeValueId: id })),
  );
};

export const isLiveTemplateAttributeValue = (templateAttributeValue: {
  ptavActive: boolean;
  deletedAt: string | null;
}) => templateAttributeValue.ptavActive && templateAttributeValue.deletedAt === null;

// A line with values whose attribute makes
// variants on demand.
export const hasDynamicLine = (lines: VariantLine[]) =>
  lines.some((line) => line.createVariant === 'DYNAMIC' && line.templateAttributeValueIds.length > 0);

// What the variant plan reads: the active lines, each with its active
// and archived values, the product's own exclusions, and every variant.
export const buildVariantPlanInput = (state: TemplateState) => {
  const ownTemplateAttributeValueIds = new Set(
    state.templateAttributeValues
      .filter((templateAttributeValue) => templateAttributeValue.deletedAt === null)
      .map((templateAttributeValue) => templateAttributeValue.id),
  );

  const lines: VariantLine[] = state.lines
    .filter((line) => line.active)
    .map((line) => {
      const values = state.templateAttributeValues.filter(
        (templateAttributeValue) => templateAttributeValue.attributeLineId === line.id,
      );
      const attribute =
        line.attributeId === null ? undefined : state.attributes.get(line.attributeId);

      return {
        id: line.id,
        sequence: line.sequence ?? 0,
        createVariant: attribute?.createVariant ?? 'ALWAYS',
        templateAttributeValueIds: values
          .filter(isLiveTemplateAttributeValue)
          .map((templateAttributeValue) => templateAttributeValue.id),
        inactiveTemplateAttributeValueIds: values
          .filter((templateAttributeValue) => !isLiveTemplateAttributeValue(templateAttributeValue))
          .map((templateAttributeValue) => templateAttributeValue.id),
      };
    });

  // Only rules about this product whose
  // source value is one of its own.
  const exclusions: VariantExclusion[] = state.exclusions
    .filter(
      (exclusion) =>
        exclusion.productTmplId === state.template.id &&
        exclusion.productTemplateAttributeValueId !== null &&
        ownTemplateAttributeValueIds.has(exclusion.productTemplateAttributeValueId),
    )
    .map((exclusion) => ({
      sourceTemplateAttributeValueId: exclusion.productTemplateAttributeValueId as string,
      excludedTemplateAttributeValueIds: state.exclusionLinks
        .filter((link) => link.productTemplateAttributeExclusionId === exclusion.id)
        .flatMap((link) =>
          link.productTemplateAttributeValueId === null ? [] : [link.productTemplateAttributeValueId],
        ),
    }));

  const combinations = variantCombinations(state);

  // planVariants keeps the last variant per combination. They are sorted by
  // (active, -id), so the active, oldest variant wins a duplicate.
  const variants: ExistingVariant[] = state.variants
    .map((variant) => ({
      id: variant.id,
      templateAttributeValueIds: combinations.get(variant.id) ?? [],
      active: variant.active && variant.deletedAt === null,
      createdAt: variant.createdAt,
    }))
    .sort(
      (a, b) =>
        Number(a.active) - Number(b.active) ||
        b.createdAt.localeCompare(a.createdAt) ||
        b.id.localeCompare(a.id),
    )
    .map(({ id, templateAttributeValueIds, active }) => ({ id, templateAttributeValueIds, active }));

  return { templateActive: state.template.active, lines, exclusions, variants };
};
