import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { PDFDocument, PDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { renderPdf } from 'src/stock/printing/utils/render-pdf.util';

const noBarcode = async () => new Uint8Array();

// Where each image lands on the first page: the matrix in front of each image drawing.
const imagePlacements = (pdf: PDFDocument) => {
  const contents = pdf.getPage(0).node.Contents();
  const streams = contents === undefined ? [] : 'asArray' in contents ? contents.asArray() : [contents];
  const text = streams
    .map((ref) => pdf.context.lookup(ref))
    .filter((stream): stream is PDFRawStream => stream instanceof PDFRawStream)
    .map((stream) => inflateSync(stream.getContents()).toString('latin1'))
    .join('\n');

  // pdf-lib moves to the image's corner with one matrix and scales to its size with another.
  return text
    .split(/\bQ\b/)
    .filter((group) => / Do\b/.test(group))
    .map((group) => {
      const matrices = [...group.matchAll(/(-?[\d.]+) 0 0 (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)].map((match) => match.slice(1).map(Number));
      const [, , x, y] = matrices.reduce((total, [a, d, e, f]) => [total[0] * a, total[1] * d, total[2] + e * total[0], total[3] + f * total[1]], [1, 1, 0, 0]);
      const [width, height] = matrices.reduce((total, [a, d]) => [total[0] * a, total[1] * d], [1, 1]);

      return { width, height, x, y };
    });
};

describe('renderPdf', () => {
  it('writes an A4 portrait PDF', async () => {
    const bytes = await renderPdf({ kind: 'document', blocks: [{ kind: 'title', text: 'WH/OUT/00001' }] }, noBarcode);
    const pdf = await PDFDocument.load(bytes);
    const { width, height } = pdf.getPage(0).getSize();

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect([Number(width.toFixed(2)), Number(height.toFixed(2))]).toEqual([595.28, 841.89]);
  });

  it('turns the page for a landscape document', async () => {
    const pdf = await PDFDocument.load(
      await renderPdf({ kind: 'document', landscape: true, blocks: [{ kind: 'text', text: 'x' }] }, noBarcode),
    );

    expect(Number(pdf.getPage(0).getSize().width.toFixed(2))).toBe(841.89);
  });

  it('continues a long table on the next page', async () => {
    const rows = Array.from({ length: 120 }, (_, index) => [`Product ${index}`, '1']);
    const pdf = await PDFDocument.load(
      await renderPdf(
        { kind: 'document', blocks: [{ kind: 'table', columns: ['Product', 'Quantity'], rows, widths: [3, 1] }] },
        noBarcode,
      ),
    );

    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});

describe('renderPdf signature', () => {
  it('draws the signature in the right third of the page, within 8 by 4 cm', async () => {
    const png = readFileSync('src/stock/printing/utils/__tests__/fixtures/signature.png');
    const pdf = await PDFDocument.load(await renderPdf({ kind: 'document', blocks: [{ kind: 'signature', png, name: 'Gym A' }] }, noBarcode));
    const placement = imagePlacements(pdf)[0];
    const mm = 72 / 25.4;
    const usable = 595.28 - 24 * mm;

    expect(placement.x).toBeCloseTo(12 * mm + (usable * 2) / 3, 1);
    expect(placement.width).toBeLessThanOrEqual(80 * mm + 0.01);
    expect(placement.height).toBeLessThanOrEqual(40 * mm + 0.01);
    expect(placement.width / placement.height).toBeCloseTo(2, 2);
  });
});
