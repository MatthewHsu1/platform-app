import { describe, expect, it } from 'vitest';

import { type LabelSheet } from 'src/stock/printing/types/label-sheet.type';
import { escapeHtml, renderHtml } from 'src/stock/printing/utils/render-html.util';

const noBarcode = () => '<svg></svg>';
const count = (text: string, part: string) => text.split(part).length - 1;

describe('escapeHtml', () => {
  it('writes the five HTML special characters as character references', () => {
    expect(escapeHtml('<b>"A&B\'s"</b>')).toBe('&lt;b&gt;&quot;A&amp;B&#39;s&quot;&lt;/b&gt;');
  });
});

describe('renderHtml', () => {
  it('puts the signature in the right third, at most 8 by 4 cm, the name centred under it', () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const html = renderHtml({ kind: 'document', blocks: [{ kind: 'signature', png, name: 'Gym <A>' }] }, 'x', noBarcode);

    expect(html).toContain('.signature { margin-left: 66.67%;');
    expect(html).toContain('max-width: 80mm; max-height: 40mm');
    expect(html).toContain('<div class="signature"><h2>Signature</h2><img src="data:image/png;base64,iVBORw==" alt=""><p class="signature-name">Gym &lt;A&gt;</p></div>');
  });

  it('prints a document on A4 portrait', () => {
    const html = renderHtml({ kind: 'document', blocks: [{ kind: 'title', text: 'WH/OUT/00001' }] }, 'WH/OUT/00001', noBarcode);

    expect(html).toContain('size: A4 portrait');
  });

  it('turns the page for a landscape document', () => {
    const html = renderHtml({ kind: 'document', landscape: true, blocks: [{ kind: 'text', text: 'x' }] }, 'x', noBarcode);

    expect(html).toContain('size: A4 landscape');
  });

  it('lays labels out one sheet per printed page, the last sheet partly filled', () => {
    const sheet: LabelSheet = {
      kind: 'labels',
      columns: 4,
      rows: 7,
      cellWidthMm: 47,
      cellHeightMm: 37.1,
      pageWidthMm: 210,
      pageHeightMm: 297,
      cells: Array.from({ length: 29 }, (_, index) => [{ kind: 'text' as const, text: `Shelf ${index}` }]),
    };
    const html = renderHtml(sheet, 'Labels', noBarcode);

    expect(count(html, 'class="sheet"')).toBe(2);
    expect(count(html, 'class="cell"')).toBe(29);
    expect(html).toContain('size: 210mm 297mm');
  });

  it('escapes a script typed into a record name', () => {
    const html = renderHtml(
      { kind: 'document', blocks: [{ kind: 'title', text: '<script>alert(1)</script>' }] },
      '<script>alert(2)</script>',
      noBarcode,
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('draws a barcode inside a table cell, under it the escaped caption', () => {
    const html = renderHtml(
      {
        kind: 'document',
        blocks: [
          {
            kind: 'table',
            columns: ['Product', 'Barcode'],
            rows: [['Treadmill', { kind: 'barcode', symbology: 'code128', value: 'SN<1>', caption: 'SN<1>', widthMm: 40, heightMm: 9 }]],
            widths: [1, 1],
          },
        ],
      },
      'x',
      (block) => `<svg data-value="${block.value.length}"></svg>`,
    );

    expect(html).toContain('<td><div class="barcode"><div class="symbol" style="width: 40mm; height: 9mm"><svg data-value="5"></svg></div><div class="caption">SN&lt;1&gt;</div></div></td>');
  });
});
