import { pricelistItemName } from 'src/product/utils/plan-pricelist-item.util';
import { supplierinfoName } from 'src/product/utils/plan-supplierinfo.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { type AppliedOn } from 'src/product/types/applied-on.type';

type NamedSeller = {
  id: string;
  name: string | null;
  productTmplId: string | null;
  productId: string | null;
  vendorName: string | null;
};

type NamedPricelistRule = {
  id: string;
  name: string | null;
  appliedOn: AppliedOn;
  productTmplId: string | null;
  productId: string | null;
  categoryName: string | null;
};

type NamedComboItem = { id: string; name: string | null; productId: string | null };

type Rename = { id: string; name: string | null };

const nameOf = (names: Map<string, string | null>, id: string | null) =>
  id === null ? null : (names.get(id) ?? null);

// These names always follow a product, variant or category rename. Twenty
// stores them: the rows whose
// stored name differs from the computed one.
export const planDerivedNames = ({
  sellers,
  pricelistRules,
  comboItems,
  templateNames,
  variantNames,
}: {
  sellers: NamedSeller[];
  pricelistRules: NamedPricelistRule[];
  comboItems: NamedComboItem[];
  templateNames: Map<string, string | null>;
  variantNames: Map<string, string | null>;
}) => {
  const changed = <TRow extends { id: string; name: string | null }>(
    rows: TRow[],
    compute: (row: TRow) => string | null,
  ): Rename[] =>
    rows.flatMap((row) => {
      const name = textOrNull(compute(row));
      return name === textOrNull(row.name) ? [] : [{ id: row.id, name }];
    });

  return {
    sellers: changed(sellers, (seller) =>
      supplierinfoName(
        seller.vendorName,
        nameOf(variantNames, seller.productId) ?? nameOf(templateNames, seller.productTmplId),
      ),
    ),
    pricelistRules: changed(pricelistRules, (rule) =>
      pricelistItemName({
        appliedOn: rule.appliedOn,
        categoryName: rule.categoryName,
        productName: nameOf(templateNames, rule.productTmplId),
        variantName: nameOf(variantNames, rule.productId),
      }),
    ),
    comboItems: changed(comboItems, (item) => nameOf(variantNames, item.productId)),
  };
};
