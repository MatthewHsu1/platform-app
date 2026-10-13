import { describe, expect, it } from 'vitest';

import { translate } from 'src/shared/i18n/translate';
import {
  checkPackageLocations,
  checkPackagesBeforeCommit,
  planApplyDestToPackage,
  planPackageHistory,
  projectPackageStock,
} from 'src/stock/utils/plan-packages-at-validate.util';
import { type PackageNode } from 'src/stock/utils/types/package-node.type';
import { type TrackingRefusal } from 'src/stock/utils/types/tracking-refusal.type';

const names = new Map([
  ['box', 'Box 1'],
  ['P', 'PACK0000001'],
]);
const node = (fields: Partial<PackageNode> & { id: string }): PackageNode => ({
  name: fields.id,
  completeName: fields.id,
  parentPackageId: null,
  packageDestId: null,
  locationId: null,
  ...fields,
});
const english = (refusals: TrackingRefusal[]) => refusals.map((refusal) => translate('en', refusal.message, refusal.values));

describe('checkPackageLocations', () => {
  it('refuses one package ending in two locations', () => {
    expect(
      english(
        checkPackageLocations({
          lines: [
            { packageId: null, resultPackageId: 'box', locationId: 'vendors', locationDestId: 'shelf1', quantityProductUom: 5 },
            { packageId: null, resultPackageId: 'box', locationId: 'vendors', locationDestId: 'shelf2', quantityProductUom: 3 },
          ],
          quants: [],
          packageNames: names,
        }),
      ),
    ).toEqual([
      'You cannot move the same package content more than once in the same transfer or split the same package into two location.\nPackage: Box 1',
    ]);
  });

  it('refuses taking part of a package elsewhere while it keeps its package', () => {
    expect(
      checkPackageLocations({
        lines: [{ packageId: 'P', resultPackageId: 'P', locationId: 'stock', locationDestId: 'output', quantityProductUom: 4 }],
        quants: [{ packageId: 'P', locationId: 'stock', quantity: 10 }],
        packageNames: names,
      }),
    ).toHaveLength(1);
  });

  it('lets a whole package move', () => {
    expect(
      checkPackageLocations({
        lines: [{ packageId: 'P', resultPackageId: 'P', locationId: 'stock', locationDestId: 'output', quantityProductUom: 10 }],
        quants: [{ packageId: 'P', locationId: 'stock', quantity: 10 }],
        packageNames: names,
      }),
    ).toEqual([]);
  });
});

describe('projectPackageStock', () => {
  it('places a package where its stock ends after the lines', () => {
    const after = projectPackageStock(
      [{ packageId: 'P', locationId: 'stock', quantity: 10 }],
      [{ packageId: 'P', resultPackageId: 'P', locationId: 'stock', locationDestId: 'output', quantityProductUom: 10 }],
    );

    expect(after.firstPositiveLocation.get('P')).toBe('output');
    expect(after.nonZeroLocations.get('P')).toEqual(new Set(['output']));
  });
});

describe('planApplyDestToPackage', () => {
  const locationNames = new Map([
    ['stock', 'WH/Stock'],
    ['output', 'WH/Output'],
    ['shelf', 'WH/Stock/Shelf 1'],
  ]);

  it('puts packages into their destination container and clears the destination', () => {
    const packages = new Map([
      ['box1', node({ id: 'box1', packageDestId: 'pallet' })],
      ['box2', node({ id: 'box2', packageDestId: 'pallet' })],
      ['pallet', node({ id: 'pallet' })],
    ]);

    expect(
      planApplyDestToPackage({
        startPackageIds: ['box1', 'box2'],
        packages,
        packageLocation: new Map([
          ['box1', 'output'],
          ['box2', 'output'],
          ['pallet', null],
        ]),
        quantLocations: new Map([
          ['box1', new Set(['output'])],
          ['box2', new Set(['output'])],
        ]),
        locationNames,
      }),
    ).toEqual({
      errors: [],
      writes: [
        { id: 'box1', parentPackageId: 'pallet', packageDestId: null },
        { id: 'box2', parentPackageId: 'pallet', packageDestId: null },
      ],
      refusedContainerIds: [],
    });
  });

  it('refuses packages of one container ending in two locations', () => {
    const packages = new Map([
      ['box1', node({ id: 'box1', name: 'Box1', packageDestId: 'pallet' })],
      ['box2', node({ id: 'box2', name: 'Box2', packageDestId: 'pallet' })],
      ['pallet', node({ id: 'pallet', name: 'Pallet' })],
    ]);

    expect(
      english(
        planApplyDestToPackage({
          startPackageIds: ['box1', 'box2'],
          packages,
          packageLocation: new Map([
            ['box1', 'output'],
            ['box2', 'shelf'],
          ]),
          quantLocations: new Map(),
          locationNames,
        }).errors,
      ),
    ).toEqual(['Packages Box1, Box2 are moved to different locations while being in the same container Pallet.']);
  });

  it('refuses moving into a container whose other packages stay elsewhere', () => {
    const packages = new Map([
      ['box1', node({ id: 'box1', packageDestId: 'pallet' })],
      ['boxC', node({ id: 'boxC', parentPackageId: 'pallet' })],
      ['pallet', node({ id: 'pallet' })],
    ]);

    expect(
      english(
        planApplyDestToPackage({
          startPackageIds: ['box1'],
          packages,
          packageLocation: new Map([['box1', 'output']]),
          quantLocations: new Map([
            ['box1', new Set(['output'])],
            ['boxC', new Set(['stock'])],
          ]),
          locationNames,
        }).errors,
      ),
    ).toEqual(["Can't move a container having packages in another location (WH/Stock) to a different location (WH/Output)."]);
  });

  it('takes a package without destination out of its container, and works up the levels', () => {
    const packages = new Map([
      ['loose', node({ id: 'loose', parentPackageId: 'old' })],
      ['old', node({ id: 'old' })],
      ['smol', node({ id: 'smol', packageDestId: 'mid' })],
      ['mid', node({ id: 'mid', packageDestId: 'big' })],
      ['big', node({ id: 'big' })],
    ]);
    const plan = planApplyDestToPackage({
      startPackageIds: ['loose', 'smol', 'mid', 'big'],
      packages,
      packageLocation: new Map([
        ['loose', 'output'],
        ['smol', 'output'],
        ['mid', 'output'],
        ['big', 'output'],
      ]),
      quantLocations: new Map([
        ['loose', new Set(['output'])],
        ['smol', new Set(['output'])],
        ['mid', new Set(['output'])],
        ['big', new Set(['output'])],
      ]),
      locationNames,
    });

    expect(plan.errors).toEqual([]);
    expect(plan.writes).toEqual([
      { id: 'loose', parentPackageId: null, packageDestId: null },
      { id: 'smol', parentPackageId: 'mid', packageDestId: null },
      { id: 'mid', parentPackageId: 'big', packageDestId: null },
    ]);
  });
});

describe('planPackageHistory', () => {
  it('freezes each package of the destination chain with its container names as they are', () => {
    const packages = new Map([
      ['smol', node({ id: 'smol', name: 'Smol', completeName: 'Smol', packageDestId: 'mid', locationId: 'stock' })],
      ['mid', node({ id: 'mid', name: 'Mid', completeName: 'Mid', packageDestId: 'big', locationId: 'stock' })],
      ['big', node({ id: 'big', name: 'Big', completeName: 'Big', locationId: 'stock' })],
    ]);
    const rows = planPackageHistory({
      resultPackageIds: ['smol'],
      packages,
      openLines: [{ id: 'l1', resultPackageId: 'smol', locationDestId: 'pack-zone', pickingId: 'pick1' }],
    });

    expect(rows.find((row) => row.packageId === 'smol')).toEqual({
      packageId: 'smol',
      packageName: 'Smol',
      locationId: 'stock',
      locationDestId: 'pack-zone',
      parentOrigId: null,
      parentOrigName: null,
      parentDestId: 'mid',
      parentDestName: 'Big > Mid',
      outermostDestId: 'big',
      pickingIds: ['pick1'],
      moveLineIds: ['l1'],
    });
    expect(rows.map((row) => row.packageId).sort()).toEqual(['big', 'mid', 'smol']);
    expect(rows.find((row) => row.packageId === 'big')?.moveLineIds).toEqual([]);
  });
});

describe('checkPackagesBeforeCommit', () => {
  it('lets two packages end in two shelves, each in one place', () => {
    const packages = new Map([
      ['pack1', node({ id: 'pack1' })],
      ['pack2', node({ id: 'pack2' })],
    ]);

    expect(
      checkPackagesBeforeCommit({
        lines: [
          { packageId: null, resultPackageId: 'pack1', locationId: 'customers', locationDestId: 'shelf1', quantityProductUom: 5 },
          { packageId: null, resultPackageId: 'pack2', locationId: 'customers', locationDestId: 'shelf2', quantityProductUom: 7 },
          { packageId: null, resultPackageId: 'pack2', locationId: 'customers', locationDestId: 'shelf2', quantityProductUom: 5 },
        ],
        packages,
        packageQuants: [],
        locationNames: new Map(),
      }),
    ).toEqual([]);
  });

  it('lets packages headed into each other three levels deep move to one place', () => {
    const packages = new Map([
      ['smol', node({ id: 'smol', name: 'Smol', packageDestId: 'mid' })],
      ['mid', node({ id: 'mid', name: 'Mid', packageDestId: 'big' })],
      ['big', node({ id: 'big', name: 'Big' })],
    ]);

    expect(
      checkPackagesBeforeCommit({
        lines: [
          { packageId: null, resultPackageId: 'smol', locationId: 'stock', locationDestId: 'pack-zone', quantityProductUom: 1 },
          { packageId: null, resultPackageId: 'mid', locationId: 'stock', locationDestId: 'pack-zone', quantityProductUom: 2 },
          { packageId: null, resultPackageId: 'big', locationId: 'stock', locationDestId: 'pack-zone', quantityProductUom: 3 },
        ],
        packages,
        packageQuants: [],
        locationNames: new Map(),
      }),
    ).toEqual([]);
  });

  it('refuses boxes of one pallet sent to two shelves', () => {
    const packages = new Map([
      ['box1', node({ id: 'box1', name: 'Box1', packageDestId: 'pallet' })],
      ['box2', node({ id: 'box2', name: 'Box2', packageDestId: 'pallet' })],
      ['pallet', node({ id: 'pallet', name: 'Pallet' })],
    ]);

    expect(
      english(
        checkPackagesBeforeCommit({
          lines: [
            { packageId: null, resultPackageId: 'box1', locationId: 'vendors', locationDestId: 'shelf1', quantityProductUom: 1 },
            { packageId: null, resultPackageId: 'box2', locationId: 'vendors', locationDestId: 'shelf2', quantityProductUom: 1 },
          ],
          packages,
          packageQuants: [],
          locationNames: new Map(),
        }),
      ),
    ).toEqual(['Packages Box1, Box2 are moved to different locations while being in the same container Pallet.']);
  });
});
