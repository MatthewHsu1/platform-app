export type SupplierinfoValues = {
  name: string | null;
  productUomId: string | null;
  productTmplId: string | null;
  productId: string | null;
};

export const supplierinfoName = (vendorName: string | null, productName: string | null) =>
  [vendorName, productName].filter((part) => part !== null && part !== '').join(' – ');

// The product comes from the variant, the
// unit from the product when empty. The name is "vendor – product".
export const planSupplierinfo = ({
  stored,
  templateIdOfProduct,
  templateUomId,
  vendorName,
  productName,
}: {
  stored: SupplierinfoValues;
  templateIdOfProduct: string | null;
  templateUomId: string | null;
  vendorName: string | null;
  productName: string | null;
}) => {
  const next = { ...stored };

  if (stored.productId !== null && templateIdOfProduct !== null) {
    next.productTmplId = templateIdOfProduct;
  }
  if (next.productUomId === null && templateUomId !== null) {
    next.productUomId = templateUomId;
  }
  next.name = supplierinfoName(vendorName, productName);

  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => value !== stored[key as keyof SupplierinfoValues]),
  ) as Partial<SupplierinfoValues>;
};
