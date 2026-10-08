import { describe, expect, it } from 'vitest';

import { planVariantDetails } from 'src/product/utils/plan-variant-details.util';

import { shirtState, variant } from './template-state.fixture';

describe('planVariantDetails', () => {
  it('names a variant by its values and adds the extra price to the sales price', () => {
    expect(planVariantDetails(shirtState()).variants).toEqual([
      {
        id: 'vLBlue',
        data: {
          name: 'Shirt (L, Blue)',
          priceExtra: { amountMicros: 2_000_000, currencyCode: 'USD' },
          lstPrice: { amountMicros: 22_000_000, currencyCode: 'USD' },
          combinationIndices: 'Blue,L',
        },
      },
    ]);
  });

  it('labels lines, product attribute values and exclusions', () => {
    const state = shirtState();
    state.exclusions = [
      { id: 'redNoL', name: null, productTemplateAttributeValueId: 'Red', productTmplId: 'shirt' },
    ];
    state.exclusionLinks = [
      { id: 'x1', productTemplateAttributeExclusionId: 'redNoL', productTemplateAttributeValueId: 'L' },
    ];
    const plan = planVariantDetails(state);

    expect(plan.lines).toEqual([
      { id: 'lineSize', data: { name: 'Size', valueCount: 3 } },
      { id: 'lineColor', data: { name: 'Color', valueCount: 2 } },
    ]);
    expect(plan.templateAttributeValues.find((change) => change.id === 'L')).toEqual({
      id: 'L',
      data: { name: 'Size: L' },
    });
    expect(plan.exclusions).toEqual([{ id: 'redNoL', data: { name: 'Red excludes L' } }]);
  });

  it('writes nothing on the second pass', () => {
    const state = shirtState();
    state.variants = [
      variant('vLBlue', {
        name: 'Shirt (L, Blue)',
        priceExtra: { amountMicros: 2_000_000, currencyCode: 'USD' },
        lstPrice: { amountMicros: 22_000_000, currencyCode: 'USD' },
        combinationIndices: 'Blue,L',
      }),
    ];
    state.lines = state.lines.map((line) => ({
      ...line,
      name: line.id === 'lineSize' ? 'Size' : 'Color',
      valueCount: line.id === 'lineSize' ? 3 : 2,
    }));
    state.templateAttributeValues = state.templateAttributeValues.map((record) => ({
      ...record,
      name: `${record.attributeLineId === 'lineSize' ? 'Size' : 'Color'}: ${record.id}`,
    }));

    expect(planVariantDetails(state)).toEqual({
      variants: [],
      lines: [],
      templateAttributeValues: [],
      exclusions: [],
    });
  });

  it('names the one variant of a plain product after the product, with its code', () => {
    const state = shirtState();
    state.lines = [];
    state.templateAttributeValues = [];
    state.combinations = [];
    state.variants = [variant('v', { defaultCode: 'SH-1' })];

    expect(planVariantDetails(state).variants).toEqual([
      {
        id: 'v',
        data: {
          name: '[SH-1] Shirt',
          priceExtra: { amountMicros: 0, currencyCode: 'USD' },
          lstPrice: { amountMicros: 20_000_000, currencyCode: 'USD' },
        },
      },
    ]);
  });
});
