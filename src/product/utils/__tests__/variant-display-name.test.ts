import { describe, expect, it } from 'vitest';

import { variantDisplayName } from 'src/product/utils/variant-display-name.util';
import { type VariantNameValue } from 'src/product/utils/types/variant-name-value.type';

const value = (
  name: string,
  lineSequence: number,
  lineActiveValueCount: number,
  overrides: Partial<VariantNameValue> = {},
): VariantNameValue => ({
  name,
  isActive: true,
  lineId: `line-${lineSequence}-${name}`,
  lineSequence,
  attributeSequence: 0,
  attributeId: 'attribute',
  valueSequence: 0,
  lineCreateVariant: 'ALWAYS',
  lineActiveValueCount,
  lineTotalValueCount: lineActiveValueCount,
  ...overrides,
});

describe('variantDisplayName', () => {
  it('adds the values of lines that offer a choice, in line order', () => {
    expect(
      variantDisplayName({
        templateName: 'Shirt',
        defaultCode: null,
        templateAttributeValues: [value('L', 10, 3), value('Red', 20, 2)],
      }),
    ).toBe('Shirt (L, Red)');
  });

  it('leaves out one-value lines and NO_VARIANT values', () => {
    expect(
      variantDisplayName({
        templateName: 'Shirt',
        defaultCode: null,
        templateAttributeValues: [
          value('Cotton', 5, 1),
          value('L', 10, 3),
          value('Gift wrap', 30, 2, { lineCreateVariant: 'NO_VARIANT' }),
        ],
      }),
    ).toBe('Shirt (L)');
  });

  it('puts the internal reference first', () => {
    expect(
      variantDisplayName({
        templateName: 'Belt',
        defaultCode: 'B-100',
        templateAttributeValues: [],
      }),
    ).toBe('[B-100] Belt');
  });

  it('counts archived values of a line when the combination holds an archived value', () => {
    expect(
      variantDisplayName({
        templateName: 'Shirt',
        defaultCode: null,
        templateAttributeValues: [
          value('S', 10, 1, { isActive: false, lineTotalValueCount: 2 }),
          value('Red', 20, 2),
        ],
      }),
    ).toBe('Shirt (S, Red)');
  });

  it('orders lines with the same sequence by their attribute sequence', () => {
    expect(
      variantDisplayName({
        templateName: 'Shirt',
        defaultCode: null,
        templateAttributeValues: [
          value('Red', 10, 2, { attributeSequence: 20 }),
          value('L', 10, 3, { attributeSequence: 10 }),
        ],
      }),
    ).toBe('Shirt (L, Red)');
  });

  it('is empty for a product without a name or reference', () => {
    expect(
      variantDisplayName({ templateName: '', defaultCode: null, templateAttributeValues: [] }),
    ).toBe('');
  });
});
