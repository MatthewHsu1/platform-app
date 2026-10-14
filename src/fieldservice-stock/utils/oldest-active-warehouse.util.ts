type WarehouseCandidate = { id: string; active: boolean | null; createdAt: string };

// The default warehouse of an order: the first one in the list, which is the oldest active one (no warehouse
// carries a sequence).
export const oldestActiveWarehouse = (warehouses: WarehouseCandidate[]): string | null => {
  const active = warehouses.filter((warehouse) => warehouse.active !== false).sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return active[0]?.id ?? null;
};
