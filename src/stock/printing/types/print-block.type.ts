import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';

export type PrintBlock =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'fields'; rows: [string, string][] }
  | { kind: 'table'; columns: string[]; rows: string[][]; widths: number[] }
  | BarcodeBlock
  | { kind: 'image'; png: Uint8Array; widthMm: number }
  | { kind: 'pageBreak' };
