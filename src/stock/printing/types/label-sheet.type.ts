import { type PrintBlock } from 'src/stock/printing/types/print-block.type';

export type LabelSheet = {
  kind: 'labels';
  columns: number;
  rows: number;
  cellWidthMm: number;
  cellHeightMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
  cells: PrintBlock[][];
};
