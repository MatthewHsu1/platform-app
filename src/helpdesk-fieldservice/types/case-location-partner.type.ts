// The contact or company of a work case, as the location rule reads it: who it counts as for the customer
// (its company when a contact has one), and the primary service location of the partner and of that customer.
export type CaseLocationPartner = {
  commercialKey: string;
  serviceLocationId: string | null;
  commercialServiceLocationId: string | null;
};
