export type AssignMove = {
  id: string;
  productUomQty: number;
  origin: string | null;
  companyId: string | null;
  personId: string | null;
  pickingTypeId: string;
  locationId: string | null;
  locationDestId: string | null;
};
