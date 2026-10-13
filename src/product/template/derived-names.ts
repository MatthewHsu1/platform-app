import { productComboItems } from 'src/product/combo/combo-records';
import { productPricelistItems } from 'src/product/pricelist/pricelist-records';
import { productSupplierinfos } from 'src/product/supplierinfo/supplierinfo-records';
import { planDerivedNames } from 'src/product/utils/plan-derived-names.util';
import { productProducts, productTemplates } from 'src/product/variant/product-records';
import { type Records } from 'src/shared/triggers/records';
import { type AppliedOn } from 'src/product/types/applied-on.type';

type StoredSeller = {
  id: string;
  name: string | null;
  productTmplId: string | null;
  productId: string | null;
  partner: { name: string | null } | null;
};

type StoredRule = {
  id: string;
  name: string | null;
  appliedOn: AppliedOn;
  productTmplId: string | null;
  productId: string | null;
  categ: { name: string | null; completeName: string | null } | null;
};

type StoredComboItem = { id: string; name: string | null; productId: string | null };

const anyOf = (filters: [string, string[]][]) => {
  const parts = filters.flatMap(([field, ids]) =>
    ids.length === 0 ? [] : [{ [field]: { in: [...new Set(ids)] } }],
  );
  return parts.length === 0 ? null : { or: parts };
};

const findWhere = async <TRow>(of: Records, filter: Record<string, unknown> | null, selection: string) =>
  filter === null ? [] : of.find<TRow>(filter, selection);

const namesOf = async (of: Records, ids: (string | null)[]) => {
  const wanted = [...new Set(ids.flatMap((id) => id ?? []))];
  const rows =
    wanted.length === 0
      ? []
      : await of.find<{ id: string; name: string | null }>({ id: { in: wanted } }, 'id name');
  return new Map(rows.map((row) => [row.id, row.name]));
};

const rename = async (of: Records, renames: { id: string; name: string | null }[]) => {
  for (const { id, name } of renames) {
    await of.update(id, { name });
  }
};

// Writes as the app, and the vendor price, rule and combo item triggers skip
// app writes, so this cannot loop.
export const refreshDerivedNames = async ({
  templateIds = [],
  variantIds = [],
  categoryIds = [],
}: {
  templateIds?: string[];
  variantIds?: string[];
  categoryIds?: string[];
}) => {
  const variantsOfTemplates =
    templateIds.length === 0
      ? []
      : await productProducts.find<{ id: string }>({ productTmplId: { in: [...new Set(templateIds)] } }, 'id');
  const allVariantIds = [...variantIds, ...variantsOfTemplates.map((variant) => variant.id)];
  const [sellers, pricelistRules, comboItems] = await Promise.all([
    findWhere<StoredSeller>(
      productSupplierinfos,
      anyOf([
        ['productTmplId', templateIds],
        ['productId', allVariantIds],
      ]),
      'id name productTmplId productId partner { name }',
    ),
    findWhere<StoredRule>(
      productPricelistItems,
      anyOf([
        ['productTmplId', templateIds],
        ['productId', allVariantIds],
        ['categId', categoryIds],
      ]),
      'id name appliedOn productTmplId productId categ { name completeName }',
    ),
    findWhere<StoredComboItem>(productComboItems, anyOf([['productId', allVariantIds]]), 'id name productId'),
  ]);
  const [templateNames, variantNames] = await Promise.all([
    namesOf(productTemplates, [...sellers, ...pricelistRules].map((row) => row.productTmplId)),
    namesOf(productProducts, [...sellers, ...pricelistRules, ...comboItems].map((row) => row.productId)),
  ]);
  const plan = planDerivedNames({
    sellers: sellers.map((seller) => ({ ...seller, vendorName: seller.partner?.name ?? null })),
    pricelistRules: pricelistRules.map((rule) => ({
      ...rule,
      categoryName: rule.categ?.completeName ?? rule.categ?.name ?? null,
    })),
    comboItems,
    templateNames,
    variantNames,
  });

  await rename(productSupplierinfos, plan.sellers);
  await rename(productPricelistItems, plan.pricelistRules);
  await rename(productComboItems, plan.comboItems);
};
