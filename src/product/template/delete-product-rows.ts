import { productComboLinks } from 'src/product/combo/combo-records';
import { productPricelistItems } from 'src/product/pricelist/pricelist-records';
import { productSupplierinfos } from 'src/product/supplierinfo/supplierinfo-records';
import { productsRefusedForDelete } from 'src/product/utils/combo-guards.util';
import {
  type ProductDeleteCascadeKind,
  planProductDeleteCascade,
} from 'src/product/utils/plan-product-delete-cascade.util';
import {
  attributeLines,
  exclusionLinks,
  exclusions,
  lineValueLinks,
  productProducts,
  productTemplates,
  templateAttributeValues,
} from 'src/product/variant/product-records';
import { variantIdsInUse } from 'src/product/variant/apply-variant-plan';
import { restoreWithNote } from 'src/shared/triggers/put-back';
import { type Records, records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

const tagLinks = records('productTagProductTemplateRel', 'productTagProductTemplateRels');
const packagingLinks = records('productTemplateUomUomRel', 'productTemplateUomUomRels');

const OWNERS: Record<ProductDeleteCascadeKind, Records> = {
  exclusionLinks,
  exclusions,
  valueLinks: lineValueLinks,
  templateAttributeValues,
  lines: attributeLines,
  variants: productProducts,
  sellers: productSupplierinfos,
  pricelistRules: productPricelistItems,
  tagLinks,
  packagingLinks,
  comboLinks: productComboLinks,
};

const idsOf = async (owner: Records, filter: Record<string, unknown>) =>
  (await owner.find<{ id: string }>(filter, 'id')).map((row) => row.id);

// Templates that are still in the trash: a product restored meanwhile keeps its rows.
const stillDeleted = async (templateIds: string[]) =>
  (
    await productTemplates.findIncludingDeleted<{ id: string; deletedAt: string | null }>(
      { id: { in: templateIds } },
      'id deletedAt',
    )
  )
    .filter((template) => template.deletedAt !== null)
    .map((template) => template.id);

// A product's variants, attribute lines, vendor prices, pricelist rules and
// link rows are deleted with it. A soft delete cascades
// nothing in Twenty, so they go to the trash here. Nothing is brought back
// when the product is restored: restore is not supported.
export const deleteProductRows = async (templateIds: string[]) => {
  const deleted = templateIds.length === 0 ? [] : await stillDeleted(templateIds);

  if (deleted.length === 0) {
    return;
  }
  const byTemplate = { productTmplId: { in: deleted } };
  const byTemplateLink = { productTemplateId: { in: deleted } };
  const [valueIds, ...rest] = await Promise.all([
    idsOf(templateAttributeValues, byTemplate),
    idsOf(lineValueLinks, { productTemplateAttributeLine: byTemplate }),
    idsOf(attributeLines, byTemplate),
    idsOf(productProducts, byTemplate),
    idsOf(productSupplierinfos, byTemplate),
    idsOf(productPricelistItems, byTemplate),
    idsOf(tagLinks, byTemplateLink),
    idsOf(packagingLinks, byTemplateLink),
    idsOf(productComboLinks, byTemplateLink),
  ]);
  const [valueLinks, lines, variants, sellers, pricelistRules, tags, packagings, combos] = rest;
  // An exclusion of another product that names one of these values goes too.
  const exclusionIds = await idsOf(
    exclusions,
    valueIds.length === 0
      ? byTemplate
      : { or: [byTemplate, { productTemplateAttributeValueId: { in: valueIds } }] },
  );
  const exclusionLinkFilters = [
    ...(exclusionIds.length === 0 ? [] : [{ productTemplateAttributeExclusionId: { in: exclusionIds } }]),
    ...(valueIds.length === 0 ? [] : [{ productTemplateAttributeValueId: { in: valueIds } }]),
  ];
  const exclusionLinkIds =
    exclusionLinkFilters.length === 0 ? [] : await idsOf(exclusionLinks, { or: exclusionLinkFilters });
  const plan = planProductDeleteCascade({
    exclusionLinks: exclusionLinkIds,
    exclusions: exclusionIds,
    valueLinks,
    templateAttributeValues: valueIds,
    lines,
    variants,
    sellers,
    pricelistRules,
    tagLinks: tags,
    packagingLinks: packagings,
    comboLinks: combos,
  });
  const errors = errorCollector();

  for (const { kind, ids } of plan) {
    await errors.run(kind, () => OWNERS[kind].softDeleteMany(ids));
  }
  errors.throwIfAny();
};

// A product cannot be deleted while a combo option holds one of its
// variants, whoever asks. The
// product comes back with a note; returns the products that stay. The app
// itself only deletes a product with no variant left.
export const restoreHeldProducts = async (deletedIds: string[]) => {
  if (deletedIds.length === 0) {
    return new Set<string>();
  }
  const variants = await productProducts.find<{ id: string; productTmplId: string | null }>(
    { productTmplId: { in: deletedIds } },
    'id productTmplId',
  );
  const variantIdsByProduct = new Map<string, string[]>();

  for (const variant of variants) {
    if (variant.productTmplId !== null) {
      variantIdsByProduct.set(variant.productTmplId, [
        ...(variantIdsByProduct.get(variant.productTmplId) ?? []),
        variant.id,
      ]);
    }
  }
  const refused = productsRefusedForDelete({
    variantIdsByProduct,
    heldIds: await variantIdsInUse(variants.map((variant) => variant.id)),
  });

  for (const recordId of refused) {
    await restoreWithNote({
      objectSingular: 'productTemplate',
      objectPlural: 'productTemplates',
      recordId,
      reason: 'A combo option holds one of its variants, so it cannot be deleted.',
    });
  }
  return new Set(refused);
};
