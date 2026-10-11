import { describe, expect, it } from 'vitest';

import { orderSignedNote, readSignatureStrokes, signatureSvg, signedSlipFileName } from 'src/stock/utils/signature.util';

describe('signature', () => {
  it('draws each stroke as one path on a white background', () => {
    expect(
      signatureSvg(
        [
          [
            [10, 20],
            [30.25, 40.04],
          ],
        ],
        400,
        200,
      ),
    ).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="white"/>' +
        '<path d="M10.0 20.0 L30.3 40.0" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    );
  });

  it('names the signer in the note when the transfer has a contact', () => {
    expect(orderSignedNote('Gym A')).toBe('Order signed by Gym A');
    expect(orderSignedNote('')).toBe('Order signed');
  });

  it('names the signed slip after the transfer', () => {
    expect(signedSlipFileName('WH/OUT/00007')).toBe('WH/OUT/00007_signed_delivery_slip.pdf');
  });

  it('takes the pad points as drawn, kept inside the pad', () => {
    expect(
      readSignatureStrokes(
        [
          [
            [10, 20],
            [401.5, -2],
          ],
        ],
        400,
        200,
      ),
    ).toEqual([
      [
        [10, 20],
        [400, 0],
      ],
    ]);
  });

  it('refuses anything that is not strokes of points', () => {
    expect(readSignatureStrokes('<svg/>', 400, 200)).toBeNull();
    expect(readSignatureStrokes([], 400, 200)).toBeNull();
    expect(readSignatureStrokes([[]], 400, 200)).toBeNull();
    expect(readSignatureStrokes([[['10', 20]]], 400, 200)).toBeNull();
    expect(readSignatureStrokes([[[Number.NaN, 20]]], 400, 200)).toBeNull();
    expect(readSignatureStrokes([[[10, 20, 30]]], 400, 200)).toBeNull();
  });
});
