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
});
