export type ProductDeleteCascadeRows = {
  exclusionLinks: string[];
  exclusions: string[];
  valueLinks: string[];
  templateAttributeValues: string[];
  lines: string[];
  variants: string[];
  sellers: string[];
  pricelistRules: string[];
  tagLinks: string[];
  packagingLinks: string[];
  comboLinks: string[];
};

export type ProductDeleteCascadeKind = keyof ProductDeleteCascadeRows;

// Children go before the rows they hang on, so a line is never deleted while
// its values are still there for the line trigger to find.
const CASCADE_ORDER: ProductDeleteCascadeKind[] = [
  'exclusionLinks',
  'exclusions',
  'valueLinks',
  'templateAttributeValues',
  'lines',
  'variants',
  'sellers',
  'pricelistRules',
  'tagLinks',
  'packagingLinks',
  'comboLinks',
];

// These rows are deleted with the product.
export const planProductDeleteCascade = (rows: ProductDeleteCascadeRows) =>
  CASCADE_ORDER.flatMap((kind) => {
    const ids = [...new Set(rows[kind])];
    return ids.length === 0 ? [] : [{ kind, ids }];
  });
