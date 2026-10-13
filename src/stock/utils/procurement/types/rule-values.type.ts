// `warehouseId` undefined: not given, so the warehouses of the location chain
// count. null: given as none.
export type RuleValues = { routeIds?: string[]; warehouseId?: string | null; packagingUomId?: string | null };
