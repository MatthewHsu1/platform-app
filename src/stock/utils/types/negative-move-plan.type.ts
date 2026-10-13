import { type ProcureMethod } from 'src/stock/types/procure-method.type';

export type NegativeMovePlan = {
  moveId: string;
  data: {
    locationId: string | null;
    locationDestId: string | null;
    locationFinalId: string | null;
    productUomQty: number;
    pickingTypeId: string | null;
    procureMethod: ProcureMethod;
    pickingId: null;
  };
  moveOrigIds: string[];
  moveDestIds: string[];
};
