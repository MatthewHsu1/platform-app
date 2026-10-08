type Operation = 'updated' | 'deleted';

// Barcode uniqueness: archived variants do not count, and a
// variant barcode must differ from every packaging barcode. A barcode typed
// on a product is its single variant's (it is written there), so
// the product's own variants do not count.
export const findBarcodeClash = ({
  barcode,
  selfId,
  ownVariantIds = [],
  variants,
  packagings,
}: {
  barcode: string | null;
  selfId: string;
  ownVariantIds?: string[];
  variants: { id: string; barcode: string | null; active: boolean }[];
  packagings: { id: string; barcode: string }[];
}): 'variant' | 'packaging' | null => {
  if (barcode === null || barcode === '') {
    return null;
  }
  if (
    variants.some(
      (variant) =>
        variant.id !== selfId &&
        !ownVariantIds.includes(variant.id) &&
        variant.active &&
        variant.barcode === barcode,
    )
  ) {
    return 'variant';
  }
  if (packagings.some((packaging) => packaging.id !== selfId && packaging.barcode === barcode)) {
    return 'packaging';
  }
  return null;
};

type UsageLine = { lineActive: boolean; productActive: boolean };

// An active line on an active product.
export const attributeInUse = (lines: UsageLine[]) =>
  lines.some((line) => line.lineActive && line.productActive);

// Usage of a value, and the delete rule: variants that
// exist and are all archived decide first (archive), whatever the lines say.
export const classifyValueUsage = ({
  lines,
  variantActiveFlags,
}: {
  lines: UsageLine[];
  variantActiveFlags: boolean[];
}) => ({
  usedOnActiveProducts: attributeInUse(lines),
  usedOnlyOnArchived: variantActiveFlags.length > 0 && !variantActiveFlags.some(Boolean),
});

// Usage on products is checked first. Then the delete is refused while any
// attribute line, archived ones too, names the attribute.
export const attributeChangeRefusal = ({
  usedOnProducts,
  hasLines = false,
  changedFields,
  operation,
}: {
  usedOnProducts: boolean;
  hasLines?: boolean;
  changedFields: string[];
  operation: Operation;
}): string | null => {
  if (!usedOnProducts) {
    return operation === 'deleted' && hasLines
      ? 'Archived products or archived attribute lines still use this attribute. Remove it from them, or archive the attribute instead.'
      : null;
  }
  if (operation === 'deleted' || changedFields.includes('active')) {
    return 'Products use this attribute. Remove it from them first.';
  }
  if (changedFields.includes('createVariant')) {
    return 'Products use this attribute, so its variant creation mode cannot change.';
  }
  return null;
};

export const attributeValueChangeRefusal = ({
  usedOnActiveProducts,
  usedOnlyOnArchived,
  changedFields,
  operation,
}: {
  usedOnActiveProducts: boolean;
  usedOnlyOnArchived: boolean;
  changedFields: string[];
  operation: Operation;
}): { kind: 'refuse'; reason: string } | { kind: 'archive' } | null => {
  if (operation === 'deleted') {
    if (usedOnlyOnArchived) {
      return { kind: 'archive' };
    }
    return usedOnActiveProducts
      ? { kind: 'refuse', reason: 'Active products use this value. Remove it from them first.' }
      : null;
  }
  if (usedOnActiveProducts && changedFields.includes('attributeId')) {
    return { kind: 'refuse', reason: 'Products use this value, so it stays on its attribute.' };
  }
  return null;
};
