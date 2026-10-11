import { describe, expect, it } from 'vitest';

import { NO_PRINT_OPTIONS, printOptionsParser, PRINT_OPTIONS_MAX_LENGTH, isPrintOptionsSizeAllowed } from 'src/stock/printing/utils/print-options.util';

const labels = printOptionsParser({ format: ['dymo', '2x7xprice'], copies: 'number', extraContent: 'string', byLot: 'boolean' });

describe('print options', () => {
  it('keeps options of the declared keys and types', () => {
    expect(labels({ format: 'dymo', copies: 2, extraContent: 'Sale', byLot: true })).toEqual({
      format: 'dymo',
      copies: 2,
      extraContent: 'Sale',
      byLot: true,
    });
  });

  it('refuses a key the printable does not declare, such as a record id', () => {
    expect(labels({ format: 'dymo', lotId: '0b6a8f4e-1d0b-4d7e-9c1f-3f1f8e3e2a10' })).toBeNull();
  });

  it('refuses a value of the wrong type or outside the choices', () => {
    expect(labels({ copies: '2' })).toBeNull();
    expect(labels({ copies: Number.NaN })).toBeNull();
    expect(labels({ format: '4x12' })).toBeNull();
    expect(labels({ byLot: 'yes' })).toBeNull();
    expect(labels({ extraContent: { text: 'x' } })).toBeNull();
  });

  it('takes no options for a printable that declares none', () => {
    expect(NO_PRINT_OPTIONS({})).toEqual({});
    expect(NO_PRINT_OPTIONS({ rows: [] })).toBeNull();
  });

  it('caps the size of the options sent with a print', () => {
    expect(isPrintOptionsSizeAllowed({ extraContent: 'x'.repeat(PRINT_OPTIONS_MAX_LENGTH) })).toBe(false);
    expect(isPrintOptionsSizeAllowed({ extraContent: 'Sale' })).toBe(true);
  });
});
