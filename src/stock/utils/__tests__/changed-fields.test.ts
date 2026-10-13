import { describe, expect, it } from 'vitest';

import { changedFields } from 'src/stock/utils/changed-fields.util';

describe('changedFields', () => {
  it('keeps only the values that differ, treating missing and null alike', () => {
    expect(changedFields({ state: 'CONFIRMED', quantity: 2, delayAlertDate: null }, { state: 'ASSIGNED', quantity: 2, delayAlertDate: undefined })).toEqual({
      state: 'ASSIGNED',
    });
  });

  it('writes nothing on a second pass', () => {
    const row = { state: 'ASSIGNED', quantity: 2 };
    expect(changedFields(row, { ...row })).toEqual({});
  });

  // A stored empty text reads back as null: an empty text is sent as null so the next pass finds nothing to write.
  it('sends an empty text as no value, and nothing when the stored text is empty too', () => {
    expect(changedFields({ descriptionPicking: null, origin: 'WH/IN/00001' }, { descriptionPicking: '', origin: '' })).toEqual({
      origin: null,
    });
  });
});
