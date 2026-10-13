// One adjustment move with its one line. Counts, reverts, relocations and
// quantity updates all make these; `quantId` is empty for a revert.
export type InventoryMovePlan = {
  quantId: string | null;
  moveId: string;
  lineId: string;
  productId: string;
  productUomId: string;
  quantity: number;
  quantityProductUom: number;
  locationId: string;
  locationDestId: string;
  // Each present only when the line moves a lot, takes from a package or brings into one.
  lotId?: string;
  packageId?: string;
  resultPackageId?: string;
  ownerId: string | null;
  inventoryName: string | null;
};
