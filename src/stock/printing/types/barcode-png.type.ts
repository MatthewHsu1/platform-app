import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';

// Draws a barcode as a PNG image; an empty result leaves the barcode out of the file.
export type BarcodePng = (block: BarcodeBlock) => Promise<Uint8Array>;
