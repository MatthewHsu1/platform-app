// The rules whose numbers a move changes: the same product, in the warehouse
// of its source or destination, or every rule of the product when neither
// location is in a warehouse.
export const orderpointsForMoves = ({
  moves,
  orderpoints,
}: {
  moves: { productId: string; locationWarehouseId: string | null; locationDestWarehouseId: string | null }[];
  orderpoints: { id: string; productId: string; warehouseId: string | null }[];
}) => {
  const ids = new Set<string>();

  for (const move of moves) {
    const warehouses = [move.locationWarehouseId, move.locationDestWarehouseId].filter((id): id is string => id !== null);

    for (const orderpoint of orderpoints) {
      if (orderpoint.productId !== move.productId) {
        continue;
      }
      if (warehouses.length === 0 || (orderpoint.warehouseId !== null && warehouses.includes(orderpoint.warehouseId))) {
        ids.add(orderpoint.id);
      }
    }
  }
  return [...ids];
};
