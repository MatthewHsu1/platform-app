import { describe, expect, it } from 'vitest';

import { orderSignedNote } from 'src/stock/picking/sign/sign-note.util';

describe('orderSignedNote', () => {
  it('names the signer in the note when the transfer has a contact', () => {
    expect(orderSignedNote('Gym A')).toBe('Order signed by Gym A');
    expect(orderSignedNote('')).toBe('Order signed');
  });
});
