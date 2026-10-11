import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';

// A table cell holds text, or a barcode drawn in the cell (its caption printed under it).
export type PrintTableCell = string | BarcodeBlock;
