export type BatchPrintData = {
  name: string;
  responsibleName: string;
  pickings: { name: string; state: string; scheduledDate: string | null; batchSequence: number }[];
  lines: {
    productId: string;
    productName: string;
    productBarcode: string;
    quantity: number;
    uomName: string;
    pickingName: string;
    lotName: string;
    packageName: string;
    resultPackageName: string;
    locationName: string;
    locationDestName: string;
  }[];
};
