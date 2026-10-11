import { describe, expect, it } from 'vitest';

import {
  generateLotNames,
  generateLotQuantities,
  nextSerial,
} from 'src/stock/utils/generate-lot-names.util';

describe('generateLotNames', () => {
  it('counts up from the given number, keeping its zero padding', () => {
    expect(generateLotNames('001', 5)).toEqual(['001', '002', '003', '004', '005']);
    expect(generateLotNames('lot01', 4)).toEqual(['lot01', 'lot02', 'lot03', 'lot04']);
  });

  it('keeps a prefix and a suffix around the last run of digits', () => {
    expect(generateLotNames('bilou-87', 10)).toEqual([
      'bilou-87',
      'bilou-88',
      'bilou-89',
      'bilou-90',
      'bilou-91',
      'bilou-92',
      'bilou-93',
      'bilou-94',
      'bilou-95',
      'bilou-96',
    ]);
    expect(generateLotNames('005-ccc', 10)).toEqual([
      '005-ccc',
      '006-ccc',
      '007-ccc',
      '008-ccc',
      '009-ccc',
      '010-ccc',
      '011-ccc',
      '012-ccc',
      '013-ccc',
      '014-ccc',
    ]);
    expect(generateLotNames('alpha-012-345-beta', 10)).toEqual([
      'alpha-012-345-beta',
      'alpha-012-346-beta',
      'alpha-012-347-beta',
      'alpha-012-348-beta',
      'alpha-012-349-beta',
      'alpha-012-350-beta',
      'alpha-012-351-beta',
      'alpha-012-352-beta',
      'alpha-012-353-beta',
      'alpha-012-354-beta',
    ]);
  });

  it('counts up only the last number when the same digits appear twice', () => {
    expect(generateLotNames('BAV023B00001S00001', 10)).toEqual([
      'BAV023B00001S00001',
      'BAV023B00001S00002',
      'BAV023B00001S00003',
      'BAV023B00001S00004',
      'BAV023B00001S00005',
      'BAV023B00001S00006',
      'BAV023B00001S00007',
      'BAV023B00001S00008',
      'BAV023B00001S00009',
      'BAV023B00001S00010',
    ]);
  });

  it('appends 0 when the name has no digit', () => {
    expect(generateLotNames('code-xxx', 3)).toEqual(['code-xxx0', 'code-xxx1', 'code-xxx2']);
  });

  it('continues a sequence value or any typed value', () => {
    expect(generateLotNames('0000036', 3)).toEqual(['0000036', '0000037', '0000038']);
    expect(generateLotNames('SN52', 3)).toEqual(['SN52', 'SN53', 'SN54']);
  });

  it('makes nothing for a count of 0', () => {
    expect(generateLotNames('001', 0)).toEqual([]);
  });
});

describe('nextSerial', () => {
  it('is the name after the newest lot of a tracked product', () => {
    expect(nextSerial({ tracking: 'SERIAL', newestLotName: 'sn-t1-02' })).toBe('sn-t1-03');
    expect(nextSerial({ tracking: 'LOT', newestLotName: 'LOT-0009' })).toBe('LOT-0010');
  });

  it('appends a digit to a newest lot name that has none', () => {
    expect(nextSerial({ tracking: 'LOT', newestLotName: 'code-xxx' })).toBe('code-xxx1');
  });

  it('is empty for an untracked product or one without a named lot', () => {
    expect(nextSerial({ tracking: 'NONE', newestLotName: 'sn-t1-02' })).toBeNull();
    expect(nextSerial({ tracking: 'SERIAL', newestLotName: null })).toBeNull();
    expect(nextSerial({ tracking: 'SERIAL', newestLotName: '' })).toBeNull();
  });
});

describe('generateLotQuantities', () => {
  it('cuts the quantity into lots of the given size plus the remainder', () => {
    expect(generateLotQuantities(10, 3)).toEqual([3, 3, 3, 1]);
    expect(generateLotQuantities(4, 1)).toEqual([1, 1, 1, 1]);
    expect(generateLotQuantities(2.5, 1)).toEqual([1, 1, 0.5]);
  });

  it('counts whole lots from what is left after the remainder, so float error adds no lot', () => {
    const quantities = generateLotQuantities(1, 0.1);

    expect(quantities).toHaveLength(10);
    expect(quantities?.slice(0, 9)).toEqual(Array.from({ length: 9 }, () => 0.1));
    expect(quantities?.[9]).toBeCloseTo(0.1);
  });

  it('makes one lot of the whole quantity when it is below the lot size', () => {
    expect(generateLotQuantities(2, 5)).toEqual([2]);
  });

  it('makes no lot when nothing was received', () => {
    expect(generateLotQuantities(0, 3)).toEqual([]);
  });

  it('refuses a quantity per lot that is not positive', () => {
    expect(generateLotQuantities(5, 0)).toBeNull();
    expect(generateLotQuantities(5, -1)).toBeNull();
  });
});
