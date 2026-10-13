import { type LabelSheet } from 'src/stock/printing/types/label-sheet.type';
import { type PrintDocument } from 'src/stock/printing/types/print-document.type';

export type PrintOutput = PrintDocument | LabelSheet | { kind: 'zpl'; text: string };
