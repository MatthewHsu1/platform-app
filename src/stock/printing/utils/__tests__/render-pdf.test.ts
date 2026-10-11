import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { renderPdf } from 'src/stock/printing/utils/render-pdf.util';

const noBarcode = async () => new Uint8Array();

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
