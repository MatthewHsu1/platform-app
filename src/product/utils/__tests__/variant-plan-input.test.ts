import { describe, expect, it } from 'vitest';

import { planVariants } from 'src/product/utils/plan-variants.util';
import {
  buildVariantPlanInput,
  missingCombinationLinks,
} from 'src/product/utils/variant-plan-input.util';

import { shirtState, templateAttributeValue, variant } from './template-state.fixture';

describe('buildVariantPlanInput', () => {
  it('feeds active lines with their active and archived values', () => {
    const state = shirtState();
    state.templateAttributeValues[1] = templateAttributeValue('M', 'lineSize', 'valueM', {
      ptavActive: false,
    });
    state.lines[1] = { ...state.lines[1], active: false };

    expect(buildVariantPlanInput(state).lines).toEqual([
      {
        id: 'lineSize',
        sequence: 10,
        createVariant: 'ALWAYS',
        templateAttributeValueIds: ['S', 'L'],
        inactiveTemplateAttributeValueIds: ['M'],
      },
    ]);
  });

  it('keeps only exclusions of this product whose source value is its own', () => {
    const state = shirtState();
    state.exclusions = [
      { id: 'own', name: null, productTemplateAttributeValueId: 'Red', productTmplId: 'shirt' },
      { id: 'foreign', name: null, productTemplateAttributeValueId: 'otherRed', productTmplId: 'shirt' },
    ];
    state.exclusionLinks = [
      { id: 'a', productTemplateAttributeExclusionId: 'own', productTemplateAttributeValueId: 'L' },
      { id: 'b', productTemplateAttributeExclusionId: 'foreign', productTemplateAttributeValueId: 'S' },
    ];

    expect(buildVariantPlanInput(state).exclusions).toEqual([
      { sourceTemplateAttributeValueId: 'Red', excludedTemplateAttributeValueIds: ['L'] },
    ]);
  });

  it('existing combination is activated, never created twice: the active, oldest variant wins', () => {
    const state = shirtState();
    state.lines = [];
    state.templateAttributeValues = [];
    state.combinations = [];
    state.variants = [
      variant('oldActive', { createdAt: '2026-10-01T00:00:00.000Z' }),
      variant('newArchived', { active: false, createdAt: '2026-10-02T00:00:00.000Z' }),
      variant('newActive', { createdAt: '2026-10-03T00:00:00.000Z' }),
      variant('deleted', { createdAt: '2026-10-04T00:00:00.000Z', deletedAt: '2026-10-05T00:00:00.000Z' }),
    ];

    expect(planVariants(buildVariantPlanInput(state))).toEqual({
      kind: 'apply',
      create: [],
      activate: [],
      extend: [],
      removeOrArchive: ['deleted', 'newArchived', 'newActive'],
    });
  });
});

describe('a run cut off before the combination links were written', () => {
  const cutOff = () => {
    const state = shirtState();
    state.combinations = [];
    state.variants = [variant('vLBlue', { combinationIndices: 'Blue,L' })];
    return state;
  };

  it('reads the combination from combinationIndices, so the variant is kept, not made again', () => {
    const state = cutOff();

    expect(buildVariantPlanInput(state).variants).toEqual([
      { id: 'vLBlue', templateAttributeValueIds: ['Blue', 'L'], active: true },
    ]);
    const plan = planVariants(buildVariantPlanInput(state));
    expect(plan.kind === 'apply' && plan.create.map((combination) => combination.join(','))).not.toContain('L,Blue');
  });

  it('lists the link rows to write again', () => {
    expect(missingCombinationLinks(cutOff())).toEqual([
      { productProductId: 'vLBlue', productTemplateAttributeValueId: 'Blue' },
      { productProductId: 'vLBlue', productTemplateAttributeValueId: 'L' },
    ]);
  });
});
