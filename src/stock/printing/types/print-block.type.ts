import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';
import { type PrintTableCell } from 'src/stock/printing/types/print-table-cell.type';
import { type SignatureBlock } from 'src/stock/printing/types/signature-block.type';

export type PrintBlock =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'fields'; rows: [string, string][] }
  | { kind: 'table'; columns: string[]; rows: PrintTableCell[][]; widths: number[] }
  | BarcodeBlock
  | SignatureBlock
  | { kind: 'pageBreak' };
