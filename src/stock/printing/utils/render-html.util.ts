import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';
import { type LabelSheet } from 'src/stock/printing/types/label-sheet.type';
import { type PrintBlock } from 'src/stock/printing/types/print-block.type';
import { type PrintDocument } from 'src/stock/printing/types/print-document.type';
import { type PrintTableCell } from 'src/stock/printing/types/print-table-cell.type';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);

// A printed page is paper, not the app: plain black on white, no theme.
const BASE_STYLE = `
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: black; background: white; }
h1 { font-size: 18pt; margin: 0 0 4mm; }
h2 { font-size: 12pt; margin: 4mm 0 2mm; }
p { margin: 0 0 2mm; white-space: pre-wrap; }
table { border-collapse: collapse; width: 100%; margin: 0 0 4mm; }
th, td { text-align: left; vertical-align: top; padding: 1mm 2mm; white-space: pre-wrap; }
table.lines th { border-bottom: 1px solid black; }
table.lines td { border-bottom: 1px solid lightgray; }
table.lines tr { break-inside: avoid; }
table.fields th { width: 35%; }
.barcode { margin: 0 0 3mm; max-width: 100%; }
.barcode .symbol { max-width: 100%; }
.barcode .symbol svg { display: block; width: 100%; height: 100%; }
.barcode .caption { font-size: 9pt; }
img { max-width: 100%; }
.page-break { break-before: page; }
`;

const page = (title: string, style: string, body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>${BASE_STYLE}${style}</style></head><body>${body}</body></html>`;

// Sizes go into style attributes: anything that is not a finite number is written as 0.
const size = (value: number) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const percent = (part: number, total: number) => `${((size(part) / total) * 100).toFixed(2)}%`;

// The SVG comes from the barcode encoder, not from record data, so it goes in as markup.
const barcodeHtml = (block: BarcodeBlock, barcodeSvg: (block: BarcodeBlock) => string) => {
  const caption = block.caption === undefined || block.caption === '' ? '' : `<div class="caption">${escapeHtml(block.caption)}</div>`;

  return `<div class="barcode"><div class="symbol" style="width: ${size(block.widthMm)}mm; height: ${size(block.heightMm)}mm">${barcodeSvg(block)}</div>${caption}</div>`;
};

const cellHtml = (cell: PrintTableCell, barcodeSvg: (block: BarcodeBlock) => string) =>
  `<td>${typeof cell === 'string' ? escapeHtml(cell) : barcodeHtml(cell, barcodeSvg)}</td>`;

const tableHtml = (block: Extract<PrintBlock, { kind: 'table' }>, barcodeSvg: (block: BarcodeBlock) => string) => {
  const total = block.widths.reduce((sum, width) => sum + size(width), 0);
  const columns =
    total > 0 ? `<colgroup>${block.widths.map((width) => `<col style="width: ${percent(width, total)}">`).join('')}</colgroup>` : '';
  const header = block.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const rows = block.rows.map((row) => `<tr>${row.map((cell) => cellHtml(cell, barcodeSvg)).join('')}</tr>`).join('');

  // Browsers repeat a table's thead at the top of every printed page it runs onto.
  return `<table class="lines">${columns}<thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
};

const blockHtml = (block: PrintBlock, barcodeSvg: (block: BarcodeBlock) => string): string => {
  switch (block.kind) {
    case 'title':
      return `<h1>${escapeHtml(block.text)}</h1>`;
    case 'heading':
      return `<h2>${escapeHtml(block.text)}</h2>`;
    case 'text':
      return `<p>${escapeHtml(block.text)}</p>`;
    case 'fields':
      return `<table class="fields"><tbody>${block.rows
        .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
        .join('')}</tbody></table>`;
    case 'table':
      return tableHtml(block, barcodeSvg);
    case 'barcode':
      return barcodeHtml(block, barcodeSvg);
    case 'image':
      return `<img src="data:image/png;base64,${Buffer.from(block.png).toString('base64')}" style="width: ${size(block.widthMm)}mm" alt="">`;
    case 'pageBreak':
      return '<div class="page-break"></div>';
  }
};

const documentHtml = (output: PrintDocument, title: string, barcodeSvg: (block: BarcodeBlock) => string) =>
  page(
    title,
    `@page { size: A4 ${output.landscape === true ? 'landscape' : 'portrait'}; margin: 12mm; }
@media screen { body { padding: 12mm; } }`,
    output.blocks.map((block) => blockHtml(block, barcodeSvg)).join(''),
  );

const labelSheetHtml = (output: LabelSheet, title: string, barcodeSvg: (block: BarcodeBlock) => string) => {
  const columns = Math.max(1, Math.floor(size(output.columns)));
  const rows = Math.max(1, Math.floor(size(output.rows)));
  const perSheet = columns * rows;
  const sheets: string[] = [];

  for (let start = 0; start < Math.max(output.cells.length, 1); start += perSheet) {
    const cells = output.cells
      .slice(start, start + perSheet)
      .map((cell) => `<div class="cell">${cell.map((block) => blockHtml(block, barcodeSvg)).join('')}</div>`)
      .join('');

    sheets.push(`<div class="sheet">${cells}</div>`);
  }

  return page(
    title,
    `@page { size: ${size(output.pageWidthMm)}mm ${size(output.pageHeightMm)}mm; margin: 0; }
.sheet { width: ${size(output.pageWidthMm)}mm; height: ${size(output.pageHeightMm)}mm; display: grid;
  grid-template-columns: repeat(${columns}, ${size(output.cellWidthMm)}mm);
  grid-template-rows: repeat(${rows}, ${size(output.cellHeightMm)}mm);
  justify-content: center; align-content: center; overflow: hidden; break-after: page; }
.sheet:last-child { break-after: auto; }
.cell { overflow: hidden; padding: 2mm; }
@media screen { body { background: lightgray; } .sheet { background: white; margin: 0 auto 8mm; } }`,
    sheets.join(''),
  );
};

export const renderHtml = (
  output: PrintDocument | LabelSheet,
  title: string,
  barcodeSvg: (block: BarcodeBlock) => string,
) => (output.kind === 'labels' ? labelSheetHtml(output, title, barcodeSvg) : documentHtml(output, title, barcodeSvg));

// The page a print link shows when it cannot print: a refusal or a used link, in plain words.
export const renderMessagePage = (message: string) =>
  page('Print', '@media screen { body { padding: 12mm; } }', `<p>${escapeHtml(message)}</p>`);
