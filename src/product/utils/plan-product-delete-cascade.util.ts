import { type ProductDeleteCascadeKind } from 'src/product/utils/types/product-delete-cascade-kind.type';
import { type ProductDeleteCascadeRows } from 'src/product/utils/types/product-delete-cascade-rows.type';

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
