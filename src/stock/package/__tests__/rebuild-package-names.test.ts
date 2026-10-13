import { describe, expect, it } from 'vitest';

import { makePackageNames, MAX_PACKAGE_DEPTH } from 'src/stock/package/rebuild-package-names';
import { PACKAGE_RECURSION_REASON } from 'src/stock/utils/plan-package-tree.util';

type Stored = { id: string; name: string | null; parentPackageId: string | null; completeName: string | null; parentPath: string | null };

const setup = (rows: [id: string, parentPackageId: string | null][]) => {
  const db = new Map<string, Stored>(rows.map(([id, parentPackageId]) => [id, { id, name: id.toUpperCase(), parentPackageId, completeName: null, parentPath: null }]));
  const writes: string[] = [];
  const names = makePackageNames({
    readPackage: async (id) => (db.has(id) ? { ...(db.get(id) as Stored) } : undefined),
    readChildren: async (parentIds) => [...db.values()].filter((row) => row.parentPackageId !== null && parentIds.includes(row.parentPackageId)),
    update: async (id, data) => {
      writes.push(id);
      Object.assign(db.get(id) as Stored, data);
    },
  });

  return { db, names, writes };
};

describe('rebuildPackageNames', () => {
  it('names a package after its containers and every package inside it after it', async () => {
    const { db, names } = setup([
      ['a', null],
      ['b', 'a'],
      ['c', 'b'],
    ]);

    await names.rebuildPackageNames(['b']);

    expect([db.get('b'), db.get('c')].map((row) => [row?.completeName, row?.parentPath])).toEqual([
      ['A > B', 'a/b/'],
      ['A > B > C', 'a/b/c/'],
    ]);
  });

  it('writes nothing when the containers above the package go round in a loop', async () => {
    const { names, writes } = setup([
      ['x', 'y'],
      ['y', 'x'],
      ['b', 'x'],
    ]);

    await expect(names.rebuildPackageNames(['b'])).rejects.toThrow(PACKAGE_RECURSION_REASON);
    expect(writes).toEqual([]);
  });

  it('writes nothing when the chain of containers never ends', async () => {
    const chain: [string, string | null][] = Array.from({ length: MAX_PACKAGE_DEPTH + 2 }, (_, index) => [`p${index}`, `p${index + 1}`]);
    const { names, writes } = setup(chain);

    await expect(names.rebuildPackageNames(['p0'])).rejects.toThrow(PACKAGE_RECURSION_REASON);
    expect(writes).toEqual([]);
  });
});
