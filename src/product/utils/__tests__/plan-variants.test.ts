import { describe, expect, it } from 'vitest';

import {
  combinationKey,
  planVariants,
  type VariantLine,
} from 'src/product/utils/plan-variants.util';

const size: VariantLine = {
  id: 'size',
  sequence: 10,
  createVariant: 'ALWAYS',
  templateAttributeValueIds: ['S', 'M', 'L'],
  inactiveTemplateAttributeValueIds: [],
};
const color: VariantLine = {
  id: 'color',
  sequence: 20,
  createVariant: 'ALWAYS',
  templateAttributeValueIds: ['Red', 'Blue'],
  inactiveTemplateAttributeValueIds: [],
};
const base = { templateActive: true, exclusions: [], variants: [] };

const big = (id: string, sequence: number, count = 11): VariantLine => ({
  id,
  sequence,
  createVariant: 'ALWAYS',
  templateAttributeValueIds: Array.from({ length: count }, (_, index) => `${id}${index}`),
  inactiveTemplateAttributeValueIds: [],
});

const applied = (plan: ReturnType<typeof planVariants>) => {
  if (plan.kind !== 'apply') {
    throw new Error(plan.reason);
  }
  return plan;
};

describe('planVariants', () => {
  it('makes one empty variant for a product with no attributes', () => {
    expect(applied(planVariants({ ...base, lines: [] })).create).toEqual([[]]);
  });

  it('makes nothing when that one variant exists', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [],
        variants: [{ id: 'v', templateAttributeValueIds: [], active: true }],
      }),
    );
    expect(plan).toEqual({
      kind: 'apply',
      create: [],
      activate: [],
      extend: [],
      removeOrArchive: [],
    });
  });

  it('makes the cartesian product: 3 sizes x 2 colors = 6', () => {
    expect(applied(planVariants({ ...base, lines: [size, color] })).create).toHaveLength(6);
  });

  it('leaves out excluded pairs: Red excludes L = 5', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [size, color],
        exclusions: [
          { sourceTemplateAttributeValueId: 'Red', excludedTemplateAttributeValueIds: ['L'] },
        ],
      }),
    );
    expect(plan.create).toHaveLength(5);
    expect(plan.create.map(combinationKey)).not.toContain(combinationKey(['L', 'Red']));
  });

  it('ignores NO_VARIANT lines: Size never, Color always = 2', () => {
    expect(
      applied(planVariants({ ...base, lines: [{ ...size, createVariant: 'NO_VARIANT' }, color] }))
        .create,
    ).toHaveLength(2);
  });

  it('refuses more than 1000 new variants and makes none', () => {
    expect(planVariants({ ...base, lines: [big('a', 1), big('b', 2), big('c', 3)] })).toEqual({
      kind: 'refuse',
      reason:
        'This would make more than 1000 new variants. The limit is 1000 new variants at a time.',
    });
  });

  it('reactivates an archived variant instead of making it again', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [{ ...size, templateAttributeValueIds: ['S', 'M'] }],
        variants: [{ id: 'vS', templateAttributeValueIds: ['S'], active: false }],
      }),
    );
    expect(plan.activate).toEqual(['vS']);
    expect(plan.create).toEqual([['M']]);
  });

  it('does not reactivate when the product is archived', () => {
    const plan = applied(
      planVariants({
        ...base,
        templateActive: false,
        lines: [{ ...size, templateAttributeValueIds: ['S'] }],
        variants: [{ id: 'vS', templateAttributeValueIds: ['S'], active: false }],
      }),
    );
    expect(plan.activate).toEqual([]);
    expect(plan.removeOrArchive).toEqual([]);
  });

  it('removes a stale variant of an archived product', () => {
    const plan = applied(
      planVariants({
        ...base,
        templateActive: false,
        lines: [{ ...size, templateAttributeValueIds: ['S'] }],
        variants: [
          { id: 'vS', templateAttributeValueIds: ['S'], active: false },
          { id: 'vL', templateAttributeValueIds: ['L'], active: false },
        ],
      }),
    );
    expect(plan.activate).toEqual([]);
    expect(plan.removeOrArchive).toEqual(['vL']);
  });

  it('merges a new one-value line even when an exclusion makes the result invalid', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [
          { ...size, templateAttributeValueIds: ['S', 'M'] },
          { ...color, templateAttributeValueIds: ['Red'] },
        ],
        exclusions: [
          { sourceTemplateAttributeValueId: 'Red', excludedTemplateAttributeValueIds: ['S'] },
        ],
        variants: [
          { id: 'vS', templateAttributeValueIds: ['S'], active: true },
          { id: 'vM', templateAttributeValueIds: ['M'], active: true },
        ],
      }),
    );
    expect(plan.extend).toEqual([
      { variantId: 'vS', templateAttributeValueIds: ['S', 'Red'] },
      { variantId: 'vM', templateAttributeValueIds: ['M', 'Red'] },
    ]);
    expect(plan.removeOrArchive).toEqual(['vS']);
    expect(plan.create).toEqual([]);
  });

  it('merges a new one-value line into a variant that holds an archived value', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [
          {
            ...size,
            templateAttributeValueIds: ['M', 'L'],
            inactiveTemplateAttributeValueIds: ['S'],
          },
          { ...color, templateAttributeValueIds: ['Red'] },
        ],
        variants: [{ id: 'vS', templateAttributeValueIds: ['S'], active: true }],
      }),
    );
    expect(plan.extend).toEqual([{ variantId: 'vS', templateAttributeValueIds: ['S', 'Red'] }]);
  });

  it('allows exactly 1000 new variants', () => {
    const plan = applied(
      planVariants({ ...base, lines: [big('a', 1, 10), big('b', 2, 10), big('c', 3, 10)] }),
    );
    expect(plan.create).toHaveLength(1000);
  });

  it('does not count existing variants toward the limit', () => {
    const existing = Array.from({ length: 100 }, (_, index) => ({
      id: `v${index}`,
      templateAttributeValueIds: [`a${index % 10}`, `b${Math.floor(index / 10)}`, 'c0'],
      active: true,
    }));
    const plan = applied(
      planVariants({
        ...base,
        lines: [big('a', 1, 10), big('b', 2, 10), big('c', 3, 11)],
        variants: existing,
      }),
    );
    expect(plan.create).toHaveLength(1000);
  });

  it('with a DYNAMIC line next to an ALWAYS line makes nothing and keeps only valid variants', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [
          { ...size, createVariant: 'DYNAMIC', templateAttributeValueIds: ['S', 'M'] },
          color,
        ],
        variants: [
          { id: 'vSRed', templateAttributeValueIds: ['S', 'Red'], active: true },
          { id: 'vS', templateAttributeValueIds: ['S'], active: true },
        ],
      }),
    );
    expect(plan.create).toEqual([]);
    expect(plan.removeOrArchive).toEqual(['vS']);
  });

  it('removes a variant that holds a value of a removed line', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [{ ...size, templateAttributeValueIds: ['S'] }],
        variants: [{ id: 'vSRed', templateAttributeValueIds: ['S', 'Red'], active: true }],
      }),
    );
    expect(plan.removeOrArchive).toEqual(['vSRed']);
    expect(plan.create).toEqual([['S']]);
  });

  it('removes a variant whose value left the line', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [{ ...size, templateAttributeValueIds: ['S', 'M'] }],
        variants: [
          { id: 'vS', templateAttributeValueIds: ['S'], active: true },
          { id: 'vM', templateAttributeValueIds: ['M'], active: true },
          { id: 'vL', templateAttributeValueIds: ['L'], active: true },
        ],
      }),
    );
    expect(plan.removeOrArchive).toEqual(['vL']);
    expect(plan.create).toEqual([]);
  });

  it('adds a new one-value line to the existing variants instead of rebuilding them', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [
          { ...size, templateAttributeValueIds: ['S', 'M'] },
          { ...color, templateAttributeValueIds: ['Red'] },
        ],
        variants: [
          { id: 'vS', templateAttributeValueIds: ['S'], active: true },
          { id: 'vM', templateAttributeValueIds: ['M'], active: true },
        ],
      }),
    );
    expect(plan.extend).toEqual([
      { variantId: 'vS', templateAttributeValueIds: ['S', 'Red'] },
      { variantId: 'vM', templateAttributeValueIds: ['M', 'Red'] },
    ]);
    expect(plan.create).toEqual([]);
    expect(plan.removeOrArchive).toEqual([]);
  });

  it('with a DYNAMIC line makes nothing new and keeps only valid variants', () => {
    const plan = applied(
      planVariants({
        ...base,
        lines: [{ ...size, createVariant: 'DYNAMIC', templateAttributeValueIds: ['S', 'M'] }],
        variants: [
          { id: 'vS', templateAttributeValueIds: ['S'], active: true },
          { id: 'vL', templateAttributeValueIds: ['L'], active: true },
        ],
      }),
    );
    expect(plan.create).toEqual([]);
    expect(plan.removeOrArchive).toEqual(['vL']);
  });

  it('a second run on the result plans nothing', () => {
    const first = applied(planVariants({ ...base, lines: [size, color] }));
    const variants = first.create.map((templateAttributeValueIds, index) => ({
      id: `v${index}`,
      templateAttributeValueIds,
      active: true,
    }));
    expect(planVariants({ ...base, lines: [size, color], variants })).toEqual({
      kind: 'apply',
      create: [],
      activate: [],
      extend: [],
      removeOrArchive: [],
    });
  });
});

describe('combinationKey', () => {
  it('sorts the ids so order does not matter', () => {
    expect(combinationKey(['Red', 'L'])).toBe(combinationKey(['L', 'Red']));
    expect(combinationKey([])).toBe('');
  });
});
