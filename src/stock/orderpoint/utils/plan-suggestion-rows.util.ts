// A row for each short pair. A pair that has a rule, archived or trashed too,
// never gets a second one: the unique product and location key counts those
// rows, and that rule's own quantity to order covers the need.
export const planSuggestionRows = ({
  toRefill,
  orderpoints,
  locationWarehouseIds,
  firstWarehouseId,
}: {
  toRefill: { productId: string; locationId: string }[];
  orderpoints: { productId: string; locationId: string }[];
  locationWarehouseIds: ReadonlyMap<string, string | null>;
  firstWarehouseId: string | null;
}) => {
  const existing = new Set(orderpoints.map((orderpoint) => `${orderpoint.productId}|${orderpoint.locationId}`));

  return toRefill.flatMap(({ productId, locationId }) =>
    existing.has(`${productId}|${locationId}`)
      ? []
      : [{ productId, locationId, warehouseId: locationWarehouseIds.get(locationId) ?? firstWarehouseId }],
  );
};
