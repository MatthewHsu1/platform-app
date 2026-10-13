export type ScrapCheck =
  | { kind: 'refuse'; message: string }
  | { kind: 'insufficient'; quantityProductUom: number }
  | { kind: 'proceed' };
