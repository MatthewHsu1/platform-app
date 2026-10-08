import { describe, expect, it } from 'vitest';

import { planLinkMove } from 'src/product/utils/plan-link-move.util';

const link = (id: string, lineId: string, valueId: string) => ({
  id,
  productTemplateAttributeLineId: lineId,
  productAttributeValueId: valueId,
});

describe('planLinkMove', () => {
  it('leaves a link alone that the other run has already moved to the line that stays', () => {
    expect(
      planLinkMove({
        moving: [link('x', 'old', 'S')],
        targetLineId: 'old',
        targetLinks: [link('x', 'old', 'S')],
      }),
    ).toEqual({ move: [], destroy: [] });
  });

  it('drops a link whose value the line that stays already has from another link', () => {
    expect(
      planLinkMove({
        moving: [link('x', 'new', 'S')],
        targetLineId: 'old',
        targetLinks: [link('y', 'old', 'S')],
      }),
    ).toEqual({ move: [], destroy: ['x'] });
  });

  it('moves the others, and keeps one link per value', () => {
    expect(
      planLinkMove({
        moving: [link('x', 'new', 'S'), link('z', 'new', 'L'), link('w', 'new', 'L')],
        targetLineId: 'old',
        targetLinks: [],
      }),
    ).toEqual({ move: ['x', 'z'], destroy: ['w'] });
  });
});
