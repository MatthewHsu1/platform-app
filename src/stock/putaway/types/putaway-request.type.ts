export type PutawayRequest = {
  key: string;
  locationDestId: string;
  productId: string;
  // In the product's unit.
  quantity: number;
  packageId: string | null;
  // The other products put away with this one, when a whole container is
  // placed at once.
  productIds?: string[];
  packagingUomId: string | null;
  // Lines being placed in the same call, left out of the location quantities.
  excludedLineIds?: string[];
  // Stock already done that lands where this request is placed, in the
  // product's unit: later requests of the call find it there.
  arrivingQuantity?: number;
};
