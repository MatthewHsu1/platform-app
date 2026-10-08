import { describe, expect, it } from 'vitest';

import { leavesNoVariant, noVariantLeftNote } from 'src/product/utils/leaves-no-variant.util';

const plan = (overrides: Partial<Parameters<typeof leavesNoVariant>[0]['plan']> = {}) => ({
  kind: 'apply' as const,
  create: [],
  activate: [],
  extend: [],
  removeOrArchive: [],
  ...overrides,
});
const live = (id: string) => ({ id, deletedAt: null });
const deleted = (id: string) => ({ id, deletedAt: '2026-10-08T00:00:00.000Z' });

describe('leavesNoVariant', () => {
  it('is true when every variant would be deleted and none made', () => {
    expect(
      leavesNoVariant({
        variants: [live('a'), live('b'), deleted('old')],
        plan: plan({ removeOrArchive: ['a', 'b', 'old'] }),
        variantsInUse: new Set(),
        hasDynamic: false,
      }),
    ).toBe(true);
  });

  it('is false when a deleted variant comes back', () => {
    expect(
      leavesNoVariant({
        variants: [live('a'), deleted('old')],
        plan: plan({ activate: ['old'], removeOrArchive: ['a'] }),
        variantsInUse: new Set(),
        hasDynamic: false,
      }),
    ).toBe(false);
  });

  it('is false when a removed variant is only archived, so the product keeps it', () => {
    expect(
      leavesNoVariant({
        variants: [live('a')],
        plan: plan({ removeOrArchive: ['a'] }),
        variantsInUse: new Set(['a']),
        hasDynamic: false,
      }),
    ).toBe(false);
  });

  it('is false for a product that makes variants on demand', () => {
    expect(
      leavesNoVariant({
        variants: [live('a')],
        plan: plan({ removeOrArchive: ['a'] }),
        variantsInUse: new Set(),
        hasDynamic: true,
      }),
    ).toBe(false);
  });
});

describe('noVariantLeftNote', () => {
  it('says the change was undone when this run undid it', () => {
    expect(noVariantLeftNote({ attempted: 2, undone: 1 })).toBe('undone');
  });

  it('says the variants were kept when there was nothing to undo', () => {
    expect(noVariantLeftNote({ attempted: 0, undone: 0 })).toBe('kept');
  });

  it('adds no second note when another run undoes the change', () => {
    expect(noVariantLeftNote({ attempted: 1, undone: 0 })).toBeNull();
  });
});
