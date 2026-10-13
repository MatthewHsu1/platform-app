export type EntirePackLine = {
  id: string;
  pickingId: string | null;
  packageId: string | null;
  resultPackageId: string | null;
  state: string;
  productId: string;
  lotId: string | null;
  quantityProductUom: number;
  isStorable: boolean;
  isEntirePack: boolean;
};
