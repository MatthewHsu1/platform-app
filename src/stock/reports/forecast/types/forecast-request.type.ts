// What the report is about: a product template, a variant, a move or a
// reordering rule; a warehouse, when given, overrides the one they imply.
export type ForecastRequest = {
  productTemplateId?: string;
  productId?: string;
  moveId?: string;
  orderpointId?: string;
  warehouseId?: string;
};
