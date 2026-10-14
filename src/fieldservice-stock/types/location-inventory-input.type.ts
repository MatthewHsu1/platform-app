// A service location as the stock location rule reads it. `partnerLocationId` is the customer location of the
// contact or company the location was made from.
type LocationInventoryRow = {
  id: string;
  parentId: string | null;
  inventoryLocationId: string | null;
  partnerLocationId: string | null;
};

// Every service location with the ids this batch of saves made, moved to another parent, or gave a stock
// location. `defaultLocationId` is the Customers location.
export type LocationInventoryInput = {
  rows: LocationInventoryRow[];
  created: string[];
  parentWritten: string[];
  inventoryWritten: string[];
  defaultLocationId: string | null;
};
