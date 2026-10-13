import { type LabelSheet } from 'src/stock/printing/types/label-sheet.type';
import { type PrintBlock } from 'src/stock/printing/types/print-block.type';
import { type ProductLabelCell } from 'src/stock/printing/types/product-label-cell.type';
import { type ProductLabelFormat } from 'src/stock/printing/types/product-label-format.type';
import { labelGrid } from 'src/stock/printing/utils/label-quantities.util';
import { isCode128Text, productBarcodeSymbology } from 'src/stock/printing/utils/picking-documents.util';

type SheetSize = { cellWidthMm: number; cellHeightMm: number; pageWidthMm: number; pageHeightMm: number };

// Label sheets are A4 with no margin; a Dymo label is its own 57 x 32 mm page.
const A4 = { pageWidthMm: 210, pageHeightMm: 297 };
const SIZES: Record<Exclude<ProductLabelFormat, 'ZPL' | 'ZPL_PRICE'>, SheetSize> = {
  DYMO: { cellWidthMm: 57, cellHeightMm: 32, pageWidthMm: 57, pageHeightMm: 32 },
  PRICE_2X7: { cellWidthMm: 97, cellHeightMm: 37.1, ...A4 },
  PRICE_4X7: { cellWidthMm: 47, cellHeightMm: 37.1, ...A4 },
  PLAIN_4X12: { cellWidthMm: 43, cellHeightMm: 19, ...A4 },
  PRICE_4X12: { cellWidthMm: 43, cellHeightMm: 19, ...A4 },
};

// Each sheet draws the barcode at its own size.
const BARCODE_SIZES: Record<keyof typeof SIZES, { widthMm: number; heightMm: number }> = {
  DYMO: { widthMm: 45.5, heightMm: 7.5 },
  PRICE_2X7: { widthMm: 33, heightMm: 14 },
  PRICE_4X7: { widthMm: 33, heightMm: 8 },
  PLAIN_4X12: { widthMm: 33, heightMm: 4 },
  PRICE_4X12: { widthMm: 33, heightMm: 4 },
};

const text = (value: string | null): PrintBlock[] => (value ? [{ kind: 'text', text: value }] : []);

// A barcode the encoder cannot draw (Code 128 holds printable ASCII only) prints as its text.
const productBarcode = (value: string, size: { widthMm: number; heightMm: number }): PrintBlock[] => {
  if (!value) {
    return [];
  }
  const symbology = productBarcodeSymbology(value);

  if (symbology === 'code128' && !isCode128Text(value)) {
    return text(value);
  }

  return [{ kind: 'barcode', symbology, value, caption: value, ...size }];
};

const productCell = (label: ProductLabelCell, format: keyof typeof SIZES, extraContent: string): PrintBlock[] => {
  const name: PrintBlock = { kind: 'heading', text: label.name };
  const code = text(label.defaultCode);
  const barcode = productBarcode(label.barcode, BARCODE_SIZES[format]);
  const price = text(label.price);

  switch (format) {
    case 'DYMO':
      return [...barcode, name, ...code, ...price];
    case 'PRICE_2X7':
      return [name, ...code, ...barcode, ...text(extraContent), ...price];
    case 'PRICE_4X7':
      return [name, ...price, ...code, ...barcode];
    case 'PRICE_4X12':
      return [name, ...code, ...price, ...barcode];
    case 'PLAIN_4X12':
      return [name, ...code, ...barcode];
  }
};

// The labels in print order, each repeated by its quantity. The price shows on the price sheets and
// on Dymo labels; extra content only on the 2 x 7 sheet.
export const productLabelSheet = (labels: ProductLabelCell[], format: ProductLabelFormat, extraContent: string): LabelSheet => {
  const sheetFormat = format === 'ZPL' || format === 'ZPL_PRICE' ? 'DYMO' : format;
  const grid = labelGrid(sheetFormat);
  const cells = labels.flatMap((label) => {
    const cell = productCell(label, sheetFormat, extraContent);

    return Array.from({ length: Math.max(0, Math.trunc(label.quantity)) }, () => cell);
  });

  return { kind: 'labels', columns: grid.columns, rows: grid.rows, ...SIZES[sheetFormat], cells };
};

export const lotLabelSheet = (lots: { defaultCode: string; productName: string; lotName: string }[]): LabelSheet => ({
  kind: 'labels',
  columns: 4,
  rows: 12,
  ...SIZES.PLAIN_4X12,
  cells: lots.map((lot) => [
    ...text(lot.defaultCode ? `[${lot.defaultCode}]` : ''),
    ...text(lot.productName),
    ...text(lot.lotName),
    ...(isCode128Text(lot.lotName)
      ? [{ kind: 'barcode' as const, symbology: 'code128' as const, value: lot.lotName, widthMm: 35, heightMm: 6 }]
      : []),
  ]),
});
