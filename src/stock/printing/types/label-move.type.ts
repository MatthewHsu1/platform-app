// A transfer's move as the label count reads it; quantities are in the move's or line's own unit.
export type LabelMove = {
  productId: string;
  quantity: number;
  demand: number;
  lines: { productId: string; quantity: number; lotName: string; isUnitLike: boolean }[];
};
