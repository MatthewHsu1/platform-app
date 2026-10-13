import { describe, expect, it } from 'vitest';

import { refusedHandMadeVariants } from 'src/product/utils/hand-made-variants.util';
import { planVariants } from 'src/product/utils/plan-variants.util';
import { buildVariantPlanInput } from 'src/product/utils/variant-plan-input.util';
import { shirtState, variant } from 'src/product/utils/__tests__/template-state.fixture';

describe('refusedHandMadeVariants', () => {
  it('refuses a second variant of a product with no attributes (same empty combination)', () => {
    const state = shirtState();
    state.lines = [];
    state.templateAttributeValues = [];
    state.combinations = [];
    state.variants = [
      variant('made', { createdAt: '2026-10-01T00:00:00.000Z' }),
      variant('byHand', { createdAt: '2026-10-08T00:00:00.000Z' }),
    ];

    expect(
      refusedHandMadeVariants({ plan: planVariants(buildVariantPlanInput(state)), handMadeIds: ['byHand'] }),
    ).toEqual(['byHand']);
  });

  it('refuses a variant with no values on a product with attributes', () => {
    const state = shirtState();
    state.variants = [...state.variants, variant('byHand', { createdAt: '2026-10-08T00:00:00.000Z' })];

    expect(
      refusedHandMadeVariants({ plan: planVariants(buildVariantPlanInput(state)), handMadeIds: ['byHand'] }),
    ).toEqual(['byHand']);
  });

  it('keeps a variant the plan keeps', () => {
    const state = shirtState();
    state.lines = [];
    state.templateAttributeValues = [];
    state.combinations = [];
    state.variants = [variant('byHand')];

    expect(
      refusedHandMadeVariants({ plan: planVariants(buildVariantPlanInput(state)), handMadeIds: ['byHand'] }),
    ).toEqual([]);
  });
});
