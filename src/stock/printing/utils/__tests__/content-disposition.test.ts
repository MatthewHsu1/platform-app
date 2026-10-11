import { describe, expect, it } from 'vitest';

import { attachmentDisposition } from 'src/stock/printing/utils/content-disposition.util';

describe('attachmentDisposition', () => {
  it('quotes the file name and replaces quotes, slashes and characters outside printable ASCII', () => {
    expect(attachmentDisposition('Lot WH/0001 "x".zpl')).toBe('attachment; filename="Lot WH_0001 _x_.zpl"');
  });

  it('replaces a backslash and an accented letter', () => {
    expect(attachmentDisposition('Café\\1.zpl')).toBe('attachment; filename="Caf__1.zpl"');
  });
});
