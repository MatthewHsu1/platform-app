export type PickingPrintLine = {
  productName: string;
  lotName: string;
  lotBarcode: string;
  quantity: number;
  uomName: string;
  from: string;
  to: string;
  packageName: string;
  resultPackageName: string;
  isEntirePack: boolean;
  expirationDate: string | null;
};
