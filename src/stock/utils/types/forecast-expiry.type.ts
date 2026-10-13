export type ForecastExpiry = {
  productIds: Set<string>;
  expiredQuants: { productId: string; reservedQuantity: number; availableQuantity: number }[];
  freshQuants: { productId: string; removalDay: string | null; availableQuantity: number }[];
};
