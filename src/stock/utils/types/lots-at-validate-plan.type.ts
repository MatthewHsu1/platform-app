import { type LotToCreate } from 'src/stock/utils/types/lot-to-create.type';

export type LotsAtValidatePlan = {
  missingProductNames: string[];
  missingLineIds: string[];
  assign: { lineId: string; lotId: string }[];
  create: LotToCreate[];
};
