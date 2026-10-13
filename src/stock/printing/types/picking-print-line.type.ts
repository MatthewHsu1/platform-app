export type PickingPrintLine = {
  productName: string;
  lotName: string;
  lotBarcode: string;
  quantity: number;
  uomName: string;
  from: string;
  to: string;
  packageName: string;
  resultPackageId: string | null;
  resultPackageName: string;
  packageHistoryId: string | null;
  isEntirePack: boolean;
  expirationDate: string | null;
};
