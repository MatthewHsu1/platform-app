import { type AppliedOn } from 'src/product/types/applied-on.type';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { type PricelistItemValues } from 'src/product/utils/types/pricelist-item-values.type';


const TARGETS_CLEARED_BY_LEVEL: Record<PricelistItemValues['appliedOn'], (keyof PricelistItemValues)[]> = {
  GLOBAL: ['productId', 'productTmplId', 'categId'],
  PRODUCT_CATEGORY: ['productId', 'productTmplId'],
  PRODUCT: ['productId', 'categId'],
  PRODUCT_VARIANT: ['categId'],
};

export const planPricelistItem = ({
  created,
  changedFields,
  item,
  templateIdOfProduct,
}: {
  created: boolean;
  changedFields: string[];
  item: PricelistItemValues;
  templateIdOfProduct: string | null;
}) => {
  const next = { ...item };

  if (next.productId !== null && templateIdOfProduct !== null && next.productTmplId !== templateIdOfProduct) {
    next.productTmplId = templateIdOfProduct;
  }
  if (created && next.appliedOn === 'GLOBAL') {
    next.appliedOn = next.productId !== null
      ? 'PRODUCT_VARIANT'
      : next.productTmplId !== null
        ? 'PRODUCT'
        : next.categId !== null
          ? 'PRODUCT_CATEGORY'
          : 'GLOBAL';
  }
  if (created || changedFields.includes('appliedOn')) {
    for (const field of TARGETS_CLEARED_BY_LEVEL[next.appliedOn]) {
      (next as Record<string, unknown>)[field] = null;
    }
  }
  if (changedFields.includes('priceMarkup') && !changedFields.includes('priceDiscount')) {
    next.priceDiscount = -next.priceMarkup;
  } else if (next.priceMarkup !== -next.priceDiscount) {
    next.priceMarkup = -next.priceDiscount;
  }
  // The base follows the other pricelist only when that pricelist changes.
  const basePricelistTouched = changedFields.includes('basePricelistId') || (created && next.basePricelistId !== null);
  if (basePricelistTouched && next.computePrice === 'PERCENTAGE') {
    next.base = next.basePricelistId !== null ? 'PRICELIST' : 'LIST_PRICE';
  }

  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => value !== item[key as keyof PricelistItemValues]),
  ) as Partial<PricelistItemValues>;
};

// The rule's name.
export const pricelistItemName = ({
  appliedOn,
  categoryName,
  productName,
  variantName,
}: {
  appliedOn: AppliedOn;
  categoryName: string | null;
  productName: string | null;
  variantName: string | null;
}) => {
  if (appliedOn === 'PRODUCT_CATEGORY') {
    return `Category: ${categoryName ?? ''}`;
  }
  if (appliedOn === 'PRODUCT') {
    return textOrNull(productName);
  }
  if (appliedOn === 'PRODUCT_VARIANT') {
    return textOrNull(variantName);
  }
  return 'All products';
};
