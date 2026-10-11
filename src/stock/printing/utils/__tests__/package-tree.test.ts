import { describe, expect, it } from 'vitest';

import { packageTree } from 'src/stock/printing/utils/package-tree.util';

const node = (id: string, parentPackageId: string | null, name = id) => ({ id, name, parentPackageId });

describe('packageTree', () => {
  it('lists the packages directly inside a package by name', () => {
    const tree = packageTree([node('box2', 'pallet', 'BOX2'), node('box1', 'pallet', 'BOX1'), node('bag', 'box1', 'BAG')]);

    expect(tree.children('pallet').map((child) => child.name)).toEqual(['BOX1', 'BOX2']);
  });

  it('counts every package below a package, grandchildren included', () => {
    const tree = packageTree([node('box1', 'pallet'), node('bag', 'box1'), node('other', null)]);

    expect([...tree.inside('pallet')].sort()).toEqual(['bag', 'box1', 'pallet']);
  });

  it('ends on packages that contain each other', () => {
    const tree = packageTree([node('a', 'b'), node('b', 'a')]);

    expect([...tree.inside('a')].sort()).toEqual(['a', 'b']);
  });
});
