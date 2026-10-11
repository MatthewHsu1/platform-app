import { type DoneLineCorrectionPlan } from 'src/stock/utils/types/done-line-correction-plan.type';

export type DoneLineCorrectionInput = {
  lineId: string;
  // Tells one edit of the line from another, so each edit's lot compensation is made once.
  editId: string;
  moveId: string | null;
  pickingId: string | null;
  productIds: string[];
  plan: DoneLineCorrectionPlan;
  quantity: number;
  quantityProductUom: number;
  note: string | null;
};
