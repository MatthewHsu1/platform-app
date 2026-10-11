// One run of identical labels: a product under one barcode, printed `quantity` times.
export type LabelPrintEntry = { productId: string; barcode: string; quantity: number };
