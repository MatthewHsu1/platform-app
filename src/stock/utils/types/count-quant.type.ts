export type CountQuant = {
  id: string;
  quantity: number;
  inventoryQuantity: number | null;
  inventoryDiffQuantity: number | null;
  inventoryQuantitySet: boolean;
};
