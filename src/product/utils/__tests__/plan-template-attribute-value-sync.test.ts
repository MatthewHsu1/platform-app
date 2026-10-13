import { describe, expect, it } from 'vitest';

import { planTemplateAttributeValueSync } from 'src/product/utils/plan-template-attribute-value-sync.util';

describe('planTemplateAttributeValueSync', () => {
  const prices = new Map([
    ['S', 0],
    ['M', 0],
    ['L', 2],
  ]);

  it('makes a product attribute value for each new value with its default extra price', () => {
    expect(
      planTemplateAttributeValueSync({
        line: { id: 'l', active: true, valueIds: ['S', 'L'] },
        templateAttributeValues: [],
        defaultExtraPriceByValue: prices,
      }),
    ).toEqual({
      create: [
        { valueId: 'S', priceExtra: 0 },
        { valueId: 'L', priceExtra: 2 },
      ],
      reactivate: [],
      removeOrArchive: [],
    });
  });

  it('reactivates the product attribute value of a value that came back, keeping its price', () => {
    expect(
      planTemplateAttributeValueSync({
        line: { id: 'l', active: true, valueIds: ['S'] },
        templateAttributeValues: [{ id: 'p', valueId: 'S', ptavActive: false }],
        defaultExtraPriceByValue: prices,
      }),
    ).toEqual({ create: [], reactivate: ['p'], removeOrArchive: [] });
  });

  it('removes the product attribute value of a value that left the line', () => {
    expect(
      planTemplateAttributeValueSync({
        line: { id: 'l', active: true, valueIds: ['S'] },
        templateAttributeValues: [
          { id: 'pS', valueId: 'S', ptavActive: true },
          { id: 'pM', valueId: 'M', ptavActive: true },
        ],
        defaultExtraPriceByValue: prices,
      }),
    ).toEqual({ create: [], reactivate: [], removeOrArchive: ['pM'] });
  });

  it('an archived line keeps no values', () => {
    expect(
      planTemplateAttributeValueSync({
        line: { id: 'l', active: false, valueIds: ['S'] },
        templateAttributeValues: [{ id: 'pS', valueId: 'S', ptavActive: true }],
        defaultExtraPriceByValue: prices,
      }).removeOrArchive,
    ).toEqual(['pS']);
  });
});
