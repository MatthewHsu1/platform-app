import { grayscale, PDFDocument, type PDFFont, type PDFImage, type PDFPage, StandardFonts } from 'pdf-lib';

import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';
import { type BarcodePng } from 'src/stock/printing/types/barcode-png.type';
import { type PrintBlock } from 'src/stock/printing/types/print-block.type';
import { type PrintDocument } from 'src/stock/printing/types/print-document.type';
import { type PrintTableCell } from 'src/stock/printing/types/print-table-cell.type';

const MM = 72 / 25.4;
// ISO 216 A4 in points.
const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 12 * MM;
const LEADING = 1.25;
const SIZE = { title: 18, heading: 12, text: 10, table: 9, caption: 9 };
const GAP = 2 * MM;
const CELL_PADDING = 2 * MM;
const BLACK = grayscale(0);
const LIGHT = grayscale(0.8);

// The standard fonts write WinAnsi only (Latin-1 and a few typographic marks): an arrow gets its
// plain form, and any other character outside it prints as "?".
const printable = (text: string) =>
  text
    .replace(/\r/g, '')
    .replace(/→/g, '->')
    .replace(/[^\n\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, '?');

const breakWord = (word: string, font: PDFFont, size: number, width: number) => {
  const pieces: string[] = [];
  let piece = '';

  for (const character of word) {
    if (piece !== '' && font.widthOfTextAtSize(piece + character, size) > width) {
      pieces.push(piece);
      piece = '';
    }
    piece += character;
  }

  return [...pieces, piece];
};

// Lines of a text at a size, broken at spaces to fit the width, and inside a word too long for it.
const wrapText = (text: string, font: PDFFont, size: number, width: number) =>
  printable(text)
    .split('\n')
    .flatMap((paragraph) => {
      const lines: string[] = [];
      let line = '';

      for (const word of paragraph.split(' ')) {
        const candidate = line === '' ? word : `${line} ${word}`;

        if (font.widthOfTextAtSize(candidate, size) <= width) {
          line = candidate;
          continue;
        }
        if (line !== '') {
          lines.push(line);
        }
        const pieces = breakWord(word, font, size, width);

        lines.push(...pieces.slice(0, -1));
        line = pieces[pieces.length - 1];
      }

      return [...lines, line];
    });

const lineHeight = (size: number) => size * LEADING;

type Cursor = { page: PDFPage; y: number };

export const renderPdf = async (output: PrintDocument, barcodePng: BarcodePng): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = output.landscape === true ? [A4.height, A4.width] : [A4.width, A4.height];
  const top = pageSize[1] - MARGIN;
  const usable = pageSize[0] - 2 * MARGIN;
  const newPage = (): Cursor => ({ page: pdf.addPage(pageSize), y: top });
  let cursor = newPage();

  // A block that does not fit under what is already on the page starts the next one.
  const ensure = (height: number) => {
    if (cursor.y - height < MARGIN && cursor.y < top) {
      cursor = newPage();
    }
  };

  const drawLines = (lines: string[], x: number, y: number, size: number, lineFont: PDFFont) => {
    lines.forEach((line, index) => {
      cursor.page.drawText(line, { x, y: y - size - index * lineHeight(size), size, font: lineFont, color: BLACK });
    });

    return lines.length * lineHeight(size);
  };

  const images = new Map<string, PDFImage | null>();
  const barcodeImage = async (block: BarcodeBlock) => {
    const key = `${block.symbology}:${block.value}:${block.heightMm}`;

    if (!images.has(key)) {
      const png = await barcodePng(block);

      images.set(key, png.length === 0 ? null : await pdf.embedPng(png));
    }

    return images.get(key) ?? null;
  };

  // The barcode shrinks with its box to fit the width it is given; the caption goes under it.
  const barcodeLayout = async (block: BarcodeBlock, width: number) => {
    const image = await barcodeImage(block);
    const scale = Math.min(1, width / (block.widthMm * MM));
    const imageWidth = block.widthMm * MM * scale;
    const imageHeight = image === null ? 0 : block.heightMm * MM * scale;
    const caption = block.caption === undefined || block.caption === '' ? [] : wrapText(block.caption, font, SIZE.caption, width);

    return {
      height: imageHeight + (image === null ? 0 : 1) + caption.length * lineHeight(SIZE.caption),
      draw: (x: number, y: number) => {
        if (image !== null) {
          cursor.page.drawImage(image, { x, y: y - imageHeight, width: imageWidth, height: imageHeight });
        }
        drawLines(caption, x, y - imageHeight - (image === null ? 0 : 1), SIZE.caption, font);
      },
    };
  };

  const cellLayout = async (cell: PrintTableCell, width: number, cellFont: PDFFont) => {
    if (typeof cell !== 'string') {
      return barcodeLayout(cell, width);
    }
    const lines = wrapText(cell, cellFont, SIZE.table, width);

    return {
      height: lines.length * lineHeight(SIZE.table),
      draw: (x: number, y: number) => {
        drawLines(lines, x, y, SIZE.table, cellFont);
      },
    };
  };

  const drawTable = async (block: Extract<PrintBlock, { kind: 'table' }>) => {
    const sizes = block.columns.map((_, index) => Math.max(0, Number(block.widths[index]) || 0));
    const total = sizes.reduce((sum, value) => sum + value, 0);
    const columnWidths = sizes.map((value) => (total > 0 ? value / total : 1 / sizes.length) * usable);
    const layoutRow = (cells: PrintTableCell[], rowFont: PDFFont) =>
      Promise.all(columnWidths.map((width, index) => cellLayout(cells[index] ?? '', width - CELL_PADDING, rowFont)));
    const drawRow = (cells: Awaited<ReturnType<typeof layoutRow>>, rule: typeof BLACK) => {
      const height = Math.max(...cells.map((cell) => cell.height)) + CELL_PADDING;
      let x = MARGIN;

      cells.forEach((cell, index) => {
        cell.draw(x + CELL_PADDING / 2, cursor.y - CELL_PADDING / 2);
        x += columnWidths[index];
      });
      cursor.y -= height;
      cursor.page.drawLine({ start: { x: MARGIN, y: cursor.y }, end: { x: MARGIN + usable, y: cursor.y }, thickness: 0.5, color: rule });
    };
    const header = await layoutRow(block.columns, bold);
    const headerHeight = Math.max(...header.map((cell) => cell.height)) + CELL_PADDING;

    ensure(headerHeight + lineHeight(SIZE.table) + CELL_PADDING);
    drawRow(header, BLACK);
    for (const row of block.rows) {
      const cells = await layoutRow(row, font);
      const height = Math.max(...cells.map((cell) => cell.height)) + CELL_PADDING;

      if (cursor.y - height < MARGIN) {
        // The header repeats at the top of each page the table runs onto.
        cursor = newPage();
        drawRow(header, BLACK);
      }
      drawRow(cells, LIGHT);
    }
    cursor.y -= GAP * 2;
  };

  const drawText = (text: string, size: number, textFont: PDFFont, spaceAfter: number) => {
    for (const line of wrapText(text, textFont, size, usable)) {
      ensure(lineHeight(size));
      cursor.y -= drawLines([line], MARGIN, cursor.y, size, textFont);
    }
    cursor.y -= spaceAfter;
  };

  const drawFields = (rows: [string, string][]) => {
    const labelWidth = usable * 0.35;

    for (const [label, value] of rows) {
      const labelLines = wrapText(label, bold, SIZE.text, labelWidth - CELL_PADDING);
      const valueLines = wrapText(value, font, SIZE.text, usable - labelWidth);
      const height = Math.max(labelLines.length, valueLines.length) * lineHeight(SIZE.text) + 1 * MM;

      ensure(height);
      drawLines(labelLines, MARGIN, cursor.y, SIZE.text, bold);
      drawLines(valueLines, MARGIN + labelWidth, cursor.y, SIZE.text, font);
      cursor.y -= height;
    }
    cursor.y -= GAP;
  };

  for (const block of output.blocks) {
    switch (block.kind) {
      case 'pageBreak':
        cursor = newPage();
        break;
      case 'title':
        drawText(block.text, SIZE.title, bold, 4 * MM);
        break;
      case 'heading':
        ensure(lineHeight(SIZE.heading) + 3 * MM);
        cursor.y -= cursor.y < top ? 2 * MM : 0;
        drawText(block.text, SIZE.heading, bold, GAP);
        break;
      case 'text':
        drawText(block.text, SIZE.text, font, GAP);
        break;
      case 'fields':
        drawFields(block.rows);
        break;
      case 'table':
        await drawTable(block);
        break;
      case 'barcode': {
        const barcode = await barcodeLayout(block, usable);

        ensure(barcode.height);
        barcode.draw(MARGIN, cursor.y);
        cursor.y -= barcode.height + 3 * MM;
        break;
      }
      case 'image': {
        const image = await pdf.embedPng(block.png);
        const width = Math.min(block.widthMm * MM, usable);
        const height = (image.height / image.width) * width;

        ensure(height);
        cursor.page.drawImage(image, { x: MARGIN, y: cursor.y - height, width, height });
        cursor.y -= height + GAP;
        break;
      }
    }
  }

  return pdf.save();
};
