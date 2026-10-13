// A sellable combo product may only hold products
// that can be sold.
export const saleComboRefusal = ({
  productType,
  saleOk,
  itemSaleOk,
}: {
  productType: string | null;
  saleOk: boolean;
  itemSaleOk: boolean[];
}) =>
  productType === 'COMBO' && saleOk && itemSaleOk.some((itemCanBeSold) => !itemCanBeSold)
    ? 'A combo product that can be sold can only hold products that can be sold.'
    : null;

// A combo item points at its variant with a restricting reference, so a
// variant an item holds cannot be deleted.
export const variantsRefusedForDelete = ({
  deletedIds,
  heldIds,
}: {
  deletedIds: string[];
  heldIds: Set<string>;
}) => deletedIds.filter((id) => heldIds.has(id));

// Deleting a product deletes its variants, so one held variant refuses it all.
export const productsRefusedForDelete = ({
  variantIdsByProduct,
  heldIds,
}: {
  variantIdsByProduct: Map<string, string[]>;
  heldIds: Set<string>;
}) =>
  [...variantIdsByProduct]
    .filter(([, variantIds]) => variantIds.some((id) => heldIds.has(id)))
    .map(([productId]) => productId);
