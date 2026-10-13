// The lot and package are present only when the original lines carried one.
export type OriginAvailability = {
  locationId: string;
  lotId?: string;
  packageId?: string;
  ownerId: string | null;
  quantity: number;
};
