// One done move line as the traceability report reads it. The transfer is the
// line's own, else its move's (`pickingIsOwn` says which); the partner is
// that transfer's contact.
export type TraceLine = {
  id: string;
  moveId: string | null;
  moveDate: string;
  date: string;
  state: string;
  productId: string;
  productName: string;
  lotId: string | null;
  lotName: string;
  quantityProductUom: number;
  uomName: string;
  locationId: string;
  locationName: string;
  locationUsage: string;
  locationDestId: string;
  locationDestName: string;
  locationDestUsage: string;
  pickingId: string | null;
  pickingIsOwn: boolean;
  pickingName: string | null;
  pickingTypeCode: string | null;
  pickingDateDone: string | null;
  partnerId: string | null;
  partnerName: string | null;
  partnerObject: 'person' | 'company' | null;
  isInventory: boolean;
  scrapId: string | null;
  scrapName: string | null;
  moveOrigIds: string[];
};
