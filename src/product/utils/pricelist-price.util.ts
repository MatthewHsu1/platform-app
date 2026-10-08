import { type AppliedOn, type ComputePrice, type PricelistBase } from 'src/product/product-options.constant';
import { floatRound } from 'src/shared/utils/float-round.util';
import { isCategoryUnder } from 'src/product/utils/category-paths.util';
import { computePrice, computeQuantity, type ResolvedUom } from 'src/uom/utils/uom.util';

export type PricelistRule = {
  id: string;
  createdAt: string;
  appliedOn: AppliedOn;
  categPath: string | null;
  categCompleteName: string | null;
  productTmplId: string | null;
  productId: string | null;
  minQuantity: number;
  dateStart: string | null;
  dateEnd: string | null;
  base: PricelistBase;
  basePricelistId: string | null;
  computePrice: ComputePrice;
  fixedPrice: number;
  percentPrice: number;
  priceDiscount: number;
  priceMarkup: number;
  priceRound: number;
  priceSurcharge: number;
  priceMinMargin: number;
  priceMaxMargin: number;
};

export type Pricelist = { id: string; name: string; currencyCode: string; rules: PricelistRule[] };

export type PricedProduct = {
  templateId: string;
  variantId: string | null;
  templateVariantIds: string[];
  categPath: string | null;
  uom: ResolvedUom;
  currencyCode: string;
  listPrice: number;
  priceExtra: number;
  standardPrice: number;
};

const APPLIED_ON_RANK: Record<AppliedOn, number> = {
  PRODUCT_VARIANT: 0,
  PRODUCT: 1,
  PRODUCT_CATEGORY: 2,
  GLOBAL: 3,
};

// Order: applied on, minimum quantity descending, category descending, id descending.
// Twenty ids are random, so creation time stands in for id.
export const sortPricelistRules = (rules: PricelistRule[]) =>
  [...rules].sort(
    (a, b) =>
      APPLIED_ON_RANK[a.appliedOn] - APPLIED_ON_RANK[b.appliedOn] ||
      b.minQuantity - a.minQuantity ||
      (b.categCompleteName ?? '').localeCompare(a.categCompleteName ?? '') ||
      b.createdAt.localeCompare(a.createdAt),
  );

const isInDateRange = (rule: PricelistRule, date: string) =>
  (rule.dateStart === null || Date.parse(rule.dateStart) <= Date.parse(date)) &&
  (rule.dateEnd === null || Date.parse(rule.dateEnd) >= Date.parse(date));

const isCandidate = (rule: PricelistRule, product: PricedProduct, date: string) =>
  isInDateRange(rule, date) &&
  (rule.categPath === null || isCategoryUnder(product.categPath, rule.categPath)) &&
  (rule.productTmplId === null || rule.productTmplId === product.templateId) &&
  (rule.productId === null ||
    (product.variantId === null
      ? product.templateVariantIds.includes(rule.productId)
      : rule.productId === product.variantId));

const isApplicableFor = (rule: PricelistRule, product: PricedProduct, qtyInProductUom: number) => {
  if (rule.minQuantity !== 0 && qtyInProductUom < rule.minQuantity) {
    return false;
  }
  if (rule.appliedOn === 'PRODUCT_CATEGORY') {
    return rule.categPath !== null && isCategoryUnder(product.categPath, rule.categPath);
  }
  if (rule.appliedOn === 'PRODUCT') {
    return rule.productTmplId === product.templateId;
  }
  if (rule.appliedOn === 'PRODUCT_VARIANT') {
    return product.variantId === null
      ? product.templateVariantIds.length === 1 && product.templateVariantIds[0] === rule.productId
      : rule.productId === product.variantId;
  }
  return true;
};

export const pricelistPrice = (input: {
  pricelists: Map<string, Pricelist>;
  pricelistId: string;
  product: PricedProduct;
  quantity: number;
  uom: ResolvedUom;
  date: string;
  digits: number;
}): { price: number; ruleId: string | null } => priceWithChain(input, []);

const priceWithChain = (
  { pricelists, pricelistId, product, quantity, uom, date, digits }: Parameters<typeof pricelistPrice>[0],
  chain: string[],
): { price: number; ruleId: string | null } => {
  if (chain.includes(pricelistId)) {
    const names = [...chain.slice(chain.indexOf(pricelistId)), pricelistId].map((id) => pricelists.get(id)?.name ?? id);
    throw new Error(`Pricelists ${names.join(' ⇒ ')} are based on each other.`);
  }
  const pricelist = pricelists.get(pricelistId);
  if (pricelist === undefined) {
    throw new Error(`Pricelist ${pricelistId} not found.`);
  }
  if (pricelist.currencyCode !== product.currencyCode) {
    throw new Error(
      `Pricelist currency ${pricelist.currencyCode} differs from the product currency ${product.currencyCode}. Twenty has no exchange rates.`,
    );
  }

  const qtyInProductUom =
    uom.id === product.uom.id ? quantity : computeQuantity({ qty: quantity, from: uom, to: product.uom, digits });
  const rule = sortPricelistRules(pricelist.rules).find(
    (candidate) => isCandidate(candidate, product, date) && isApplicableFor(candidate, product, qtyInProductUom),
  );
  const convert = (amount: number) => computePrice({ price: amount, from: product.uom, to: uom });
  const basePrice = (base: PricelistBase, basePricelistId: string | null) => {
    if (base === 'PRICELIST' && basePricelistId !== null) {
      return priceWithChain(
        { pricelists, pricelistId: basePricelistId, product, quantity, uom, date, digits },
        [...chain, pricelistId],
      ).price;
    }
    if (base === 'STANDARD_PRICE') {
      return convert(product.standardPrice);
    }
    return convert(product.listPrice + product.priceExtra);
  };

  if (rule === undefined) {
    return { price: basePrice('LIST_PRICE', null), ruleId: null };
  }
  if (rule.computePrice === 'FIXED') {
    return { price: convert(rule.fixedPrice), ruleId: rule.id };
  }

  const base = basePrice(rule.base, rule.basePricelistId);
  if (rule.computePrice === 'PERCENTAGE') {
    return { price: base - (base * rule.percentPrice) / 100, ruleId: rule.id };
  }

  const discount = rule.base === 'STANDARD_PRICE' ? -rule.priceMarkup : rule.priceDiscount;
  let price = base - (base * discount) / 100;
  if (rule.priceRound !== 0) {
    price = floatRound(price, rule.priceRound, 'HALF-UP');
  }
  if (rule.priceSurcharge !== 0) {
    price += convert(rule.priceSurcharge);
  }
  if (rule.priceMinMargin !== 0) {
    price = Math.max(price, base + convert(rule.priceMinMargin));
  }
  if (rule.priceMaxMargin !== 0) {
    price = Math.min(price, base + convert(rule.priceMaxMargin));
  }

  return { price, ruleId: rule.id };
};

// The loop check walks down from the saved rule's own edge,
// so a loop elsewhere is neither hidden nor blamed on it.
export const findLoopThroughRule = ({
  own,
  others,
}: {
  own: { pricelistId: string; basePricelistId: string };
  others: { pricelistId: string; basePricelistId: string }[];
}) => {
  const next = new Map<string, string[]>();
  for (const { pricelistId, basePricelistId } of others) {
    next.set(pricelistId, [...(next.get(pricelistId) ?? []), basePricelistId]);
  }
  const visited = new Set<string>();
  const walk = (id: string, path: string[]): string[] | null => {
    if (id === own.pricelistId) {
      return [...path, id];
    }
    if (visited.has(id)) {
      return null;
    }
    visited.add(id);
    for (const target of next.get(id) ?? []) {
      const found = walk(target, [...path, id]);
      if (found !== null) {
        return found;
      }
    }
    return null;
  };

  const found = walk(own.basePricelistId, [own.pricelistId]);
  return found;
};
