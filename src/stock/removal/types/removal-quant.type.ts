export type RemovalQuant = {
  id: string;
  inDate: string | null;
  // Breaks ties between quants that came in at the same time, before the id does.
  createdAt?: string | null;
  // The lot's removal date, for first expiry, first out.
  removalDate?: string | null;
  locationCompleteName: string | null;
  lotId: string | null;
  packageId: string | null;
  // Packages holding the same quantity are taken in the order they were made.
  packageCreatedAt?: string | null;
  quantity: number;
  reservedQuantity: number;
};
