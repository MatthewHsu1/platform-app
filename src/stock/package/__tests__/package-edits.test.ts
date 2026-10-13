import { type ObjectRecordEvent } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { makePackageEdits } from 'src/stock/package/package-edits';
import { RESTRICT_DELETE_MESSAGE } from 'src/stock/stock-messages';
import { PACKAGE_DEST_INSIDE_ITSELF, PACKAGE_NOT_EMPTY_NO_LOCATION } from 'src/stock/utils/plan-package-rules.util';
import { type PackageEventRecord } from 'src/stock/package/types/package-event-record.type';
import { type RelocatePackageOutcome } from 'src/stock/package/types/relocate-package-outcome.type';

type Pack = { id: string; parentPackageId: string | null; packageDestId: string | null; deleted: boolean };

const record = (id: string, values: Partial<PackageEventRecord> = {}, source = 'MANUAL'): PackageEventRecord => ({
  id,
  name: id,
  parentPackageId: null,
  packageDestId: null,
  packageTypeId: null,
  shippingWeight: null,
  locationId: null,
  updatedBy: { source },
  ...values,
});

const updated = (before: PackageEventRecord, after: PackageEventRecord) =>
  ({ recordId: after.id, properties: { before, after } }) as unknown as ObjectRecordEvent<PackageEventRecord>;
const deleted = (before: PackageEventRecord) =>
  ({ recordId: before.id, properties: { before } }) as unknown as ObjectRecordEvent<PackageEventRecord>;

const setup = ({ packages = [], named = [], outcome = { kind: 'done' } }: { packages?: Pack[]; named?: string[]; outcome?: RelocatePackageOutcome }) => {
  const db = new Map(packages.map((pack) => [pack.id, { ...pack }]));
  const calls: unknown[] = [];
  const reads = { count: 0 };
  const edits = makePackageEdits({
    relocatePackage: async (packageId, toLocationId) => {
      calls.push({ relocate: packageId, to: toLocationId });
      return outcome;
    },
    putBack: async (event, data, message) => {
      calls.push({ putBack: event.recordId, data, message });
    },
    addNote: async (event, message) => {
      calls.push({ note: event.recordId, message });
    },
    recomputePackage: async (packageIds) => {
      calls.push({ recompute: packageIds });
    },
    readDestinations: async () => {
      reads.count += 1;
      return [...db.values()].filter((pack) => pack.packageDestId !== null);
    },
    readStoredDestination: async (packageId) => db.get(packageId)?.packageDestId,
    stillDeletedIds: async (ids) => ids.filter((id) => db.get(id)?.deleted === true),
    namedIds: async (ids) => new Set(ids.filter((id) => named.includes(id))),
    restore: async (event, message) => {
      calls.push({ restore: event.recordId, message });
    },
    readContainedIds: async (packageId) => [...db.values()].filter((pack) => pack.parentPackageId === packageId).map((pack) => pack.id),
    readHeadedIntoIds: async (packageId) => [...db.values()].filter((pack) => pack.packageDestId === packageId).map((pack) => pack.id),
    clearContainer: async (ids) => {
      ids.forEach((id) => ((db.get(id) as Pack).parentPackageId = null));
    },
    clearDestination: async (ids) => {
      ids.forEach((id) => ((db.get(id) as Pack).packageDestId = null));
    },
  });

  return { calls, db, edits, reads };
};

describe('package location edits', () => {
  it('a refused move puts back the location the package had before the edit', async () => {
    const { calls, edits } = setup({ outcome: { kind: 'refused', reason: PACKAGE_NOT_EMPTY_NO_LOCATION, values: {} } });

    await edits.relocatePackages([updated(record('pack1', { locationId: 'stock' }), record('pack1', { locationId: null }))]);

    expect(calls).toEqual([
      { relocate: 'pack1', to: null },
      { putBack: 'pack1', data: { locationId: 'stock' }, message: PACKAGE_NOT_EMPTY_NO_LOCATION },
    ]);
  });

  it('while another run moves the package, its location comes from its stock and a note says why', async () => {
    const { calls, edits } = setup({ outcome: { kind: 'held' } });

    await edits.relocatePackages([updated(record('pack1', { locationId: 'stock' }), record('pack1', { locationId: 'shelf1' }))]);

    expect(calls).toEqual([{ relocate: 'pack1', to: 'shelf1' }, { recompute: ['pack1'] }, { note: 'pack1', message: CLAIM_HELD_MESSAGE }]);
  });

  it('moves only on a staff change of the location', async () => {
    const { calls, edits } = setup({});

    await edits.relocatePackages([
      updated(record('pack1', { locationId: 'stock' }), record('pack1', { locationId: 'shelf1' }, 'APPLICATION')),
      updated(record('pack2', { locationId: 'stock' }), record('pack2', { locationId: 'stock' })),
      updated(record('pack3', { locationId: 'stock' }), record('pack3', { locationId: 'shelf1' })),
    ]);

    expect(calls).toEqual([{ relocate: 'pack3', to: 'shelf1' }]);
  });
});

describe('package destination edits', () => {
  it('puts back a destination that is one of the packages headed into the package', async () => {
    const { calls, edits } = setup({
      packages: [
        { id: 'A', parentPackageId: null, packageDestId: 'C', deleted: false },
        { id: 'B', parentPackageId: null, packageDestId: 'A', deleted: false },
        { id: 'C', parentPackageId: null, packageDestId: 'B', deleted: false },
      ],
    });

    await edits.refuseDestinationLoops([updated(record('A'), record('A', { packageDestId: 'C' }))]);

    expect(calls).toEqual([{ putBack: 'A', data: { packageDestId: null }, message: PACKAGE_DEST_INSIDE_ITSELF }]);
  });

  it('reads the links once for a batch and refuses only the second of two packages headed into each other', async () => {
    const { calls, edits, reads } = setup({
      packages: [
        { id: 'A', parentPackageId: null, packageDestId: 'B', deleted: false },
        { id: 'B', parentPackageId: null, packageDestId: 'A', deleted: false },
      ],
    });

    await edits.refuseDestinationLoops([
      updated(record('A'), record('A', { packageDestId: 'B' })),
      updated(record('B'), record('B', { packageDestId: 'A' })),
    ]);

    expect({ calls, reads: reads.count }).toEqual({
      calls: [{ putBack: 'A', data: { packageDestId: null }, message: PACKAGE_DEST_INSIDE_ITSELF }],
      reads: 1,
    });
  });

  it('keeps a destination outside the package', async () => {
    const { calls, edits } = setup({
      packages: [
        { id: 'A', parentPackageId: null, packageDestId: 'D', deleted: false },
        { id: 'B', parentPackageId: null, packageDestId: 'A', deleted: false },
      ],
    });

    await edits.refuseDestinationLoops([updated(record('A'), record('A', { packageDestId: 'D' }))]);

    expect(calls).toEqual([]);
  });
});

describe('package container edits', () => {
  it('places a package and its old and new containers again when it changes container', async () => {
    const { calls, edits } = setup({});

    await edits.placeContainers('updated', [updated(record('pack1', { parentPackageId: 'old' }), record('pack1', { parentPackageId: 'new' }))]);

    expect(calls).toEqual([{ recompute: ['pack1', 'old', 'new'] }]);
  });
});

describe('deleted packages', () => {
  it('puts back a package that stock or a move line still names', async () => {
    const { calls, db, edits } = setup({
      packages: [
        { id: 'pallet', parentPackageId: null, packageDestId: null, deleted: true },
        { id: 'box', parentPackageId: 'pallet', packageDestId: null, deleted: false },
      ],
      named: ['pallet'],
    });

    await edits.settleDeletedPackages([deleted(record('pallet'))]);

    expect({ calls, box: db.get('box')?.parentPackageId }).toEqual({
      calls: [{ restore: 'pallet', message: RESTRICT_DELETE_MESSAGE }],
      box: 'pallet',
    });
  });

  it('takes the packages out of a deleted container and clears the destination of packages headed into it', async () => {
    const { calls, db, edits } = setup({
      packages: [
        { id: 'pallet', parentPackageId: 'rack', packageDestId: null, deleted: true },
        { id: 'box', parentPackageId: 'pallet', packageDestId: null, deleted: false },
        { id: 'crate', parentPackageId: null, packageDestId: 'pallet', deleted: false },
      ],
    });

    await edits.settleDeletedPackages([deleted(record('pallet', { parentPackageId: 'rack' }))]);

    expect({ box: db.get('box')?.parentPackageId, crate: db.get('crate')?.packageDestId, calls }).toEqual({
      box: null,
      crate: null,
      calls: [{ recompute: ['rack'] }],
    });
  });
});
