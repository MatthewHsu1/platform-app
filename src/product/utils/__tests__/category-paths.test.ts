import { describe, expect, it } from 'vitest';

import { isCategoryUnder, resolveCategories } from 'src/product/utils/category-paths.util';

describe('resolveCategories', () => {
  it('joins the names from the root with " / "', () => {
    const { resolved } = resolveCategories([
      { id: 'g', name: 'Goods', parentId: null },
      { id: 'p', name: 'Parts', parentId: 'g' },
      { id: 'b', name: 'Belts', parentId: 'p' },
    ]);
    expect(resolved.get('b')).toEqual({ completeName: 'Goods / Parts / Belts', parentPath: 'g/p/b/' });
    expect(resolved.get('g')).toEqual({ completeName: 'Goods', parentPath: 'g/' });
  });

  // An empty full name is stored as no value, so the next pass compares equal.
  it('gives no full name to a category whose names are all empty', () => {
    const { resolved } = resolveCategories([{ id: 'x', name: null, parentId: null }]);
    expect(resolved.get('x')).toEqual({ completeName: null, parentPath: 'x/' });
  });
});

describe('isCategoryUnder', () => {
  it('is true for the category itself and every category below it', () => {
    expect(isCategoryUnder('g/p/b/', 'g/p/')).toBe(true);
    expect(isCategoryUnder('g/p/', 'g/p/')).toBe(true);
  });

  it('is false for a sibling, a parent, or no category', () => {
    expect(isCategoryUnder('g/q/', 'g/p/')).toBe(false);
    expect(isCategoryUnder('g/', 'g/p/')).toBe(false);
    expect(isCategoryUnder(null, 'g/')).toBe(false);
  });
});
