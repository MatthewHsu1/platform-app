// A move as a push rule's filter reads it: its own fields and one hop through
// its product, product category and transfer.
export type PushFilterRecord = {
  productUomQty: number;
  quantity: number;
  origin: string | null;
  priority: string;
  date: string;
  product: { name: string | null; defaultCode: string | null; barcode: string | null };
  category: { name: string | null; completeName: string | null } | null;
  picking: { name: string | null; origin: string | null; priority: string | null; pickingTypeCode: string | null } | null;
};
