import { type PushFilterRecord } from 'src/stock/rule/types/push-filter-record.type';

// A done move as its push reads it.
export type PushMove = {
  id: string;
  productId: string;
  productUomId: string;
  quantity: number;
  productUomQty: number;
  locationId: string;
  locationDestId: string;
  locationFinalId: string | null;
  date: string;
  dateDeadline: string | null;
  warehouseId: string | null;
  pickingTypeWarehouseId: string | null;
  routeIds: string[];
  resultPackageTypeRouteIds: string[];
  packagingUomId: string | null;
  isInventory: boolean;
  // Where the move this one returns had gone; null when it is no return.
  originReturnedMoveDestId: string | null;
  origin: string | null;
  pickingName: string | null;
  companyId: string | null;
  personId: string | null;
  // The partner's customer location (Customers when the partner has none); null without a partner.
  partnerCustomerLocationId: string | null;
  restrictPartnerId: string | null;
  descriptionPickingManual: string | null;
  sequence: number | null;
  referenceIds: string[];
  filterRecord: PushFilterRecord;
  moveDests: { id: string; locationId: string; ruleId: string | null }[];
};
