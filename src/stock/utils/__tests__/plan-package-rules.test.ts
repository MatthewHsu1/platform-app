import { describe, expect, it } from 'vitest';

import {
  NEGATIVE_PACKAGE_UNPACK,
  NOTHING_TO_UNPACK,
  PACKAGE_EMPTY_CANNOT_MOVE,
  PACKAGE_NOT_EMPTY_NO_LOCATION,
  packageDestinationDescendants,
  planKeptContainers,
  planPackageLocations,
  planPackageRelocation,
  planUnpack,
} from 'src/stock/utils/plan-package-rules.util';

describe('planPackageLocations', () => {
  it('places a package where its stock is, and a container where its first package is', () => {
    const locations = planPackageLocations({
      packages: [
        { id: 'pack1', name: 'Pack1', parentPackageId: 'pack2' },
        { id: 'pack2', name: 'Pack2', parentPackageId: null },
        { id: 'empty', name: 'Empty', parentPackageId: null },
      ],
      firstPositiveQuantLocation: new Map([['pack1', 'stock']]),
    });

    expect(locations.get('pack1')).toBe('stock');
    expect(locations.get('pack2')).toBe('stock');
    expect(locations.get('empty')).toBeNull();
  });

  it('takes the first contained package by name', () => {
    const locations = planPackageLocations({
      packages: [
        { id: 'b', name: 'B', parentPackageId: 'top' },
        { id: 'a', name: 'A', parentPackageId: 'top' },
        { id: 'top', name: 'Top', parentPackageId: null },
      ],
      firstPositiveQuantLocation: new Map([
        ['a', 'shelf1'],
        ['b', 'shelf2'],
      ]),
    });

    expect(locations.get('top')).toBe('shelf1');
  });

  it('takes the place a contained package already shows when that package is not placed again', () => {
    const locations = planPackageLocations({
      packages: [
        { id: 'top', name: 'Top', parentPackageId: null },
        { id: 'box', name: 'Box', parentPackageId: 'top' },
      ],
      firstPositiveQuantLocation: new Map(),
      knownLocations: new Map([['box', 'shelf2']]),
    });

    expect(locations.get('top')).toBe('shelf2');
  });
});

describe('planPackageRelocation', () => {
  const stock = [
    { id: 'q1', quantity: 5, reservedQuantity: 0, locationId: 'stock' },
    { id: 'q2', quantity: 0, reservedQuantity: 1, locationId: 'stock' },
  ];

  it('moves the positive content of a package', () => {
    expect(planPackageRelocation({ packageId: 'p', newLocationId: 'shelf', containedQuants: stock })).toEqual({
      kind: 'move',
      quantIds: ['q1'],
      upToParentPackageIds: ['p'],
    });
  });

  it('refuses to clear the location of a package with content, or to move an empty one', () => {
    expect(planPackageRelocation({ packageId: 'p', newLocationId: null, containedQuants: stock })).toEqual({
      kind: 'refuse',
      reason: PACKAGE_NOT_EMPTY_NO_LOCATION,
    });
    expect(planPackageRelocation({ packageId: 'p', newLocationId: 'shelf', containedQuants: [] })).toEqual({
      kind: 'refuse',
      reason: PACKAGE_EMPTY_CANNOT_MOVE,
    });
  });

  it('lets an empty package lose its location', () => {
    expect(planPackageRelocation({ packageId: 'p', newLocationId: null, containedQuants: [] })).toEqual({ kind: 'nothing' });
  });

  it('counts a reservation alone as content', () => {
    expect(
      planPackageRelocation({
        packageId: 'p',
        newLocationId: null,
        containedQuants: [{ id: 'q2', quantity: 0, reservedQuantity: 1, locationId: 'stock' }],
      }),
    ).toEqual({ kind: 'refuse', reason: PACKAGE_NOT_EMPTY_NO_LOCATION });
  });

  it('moves nothing again when all of its stock already sits in the new location', () => {
    expect(planPackageRelocation({ packageId: 'p', newLocationId: 'stock', containedQuants: stock })).toEqual({ kind: 'nothing' });
  });
});

describe('packageDestinationDescendants', () => {
  it('holds the package and every package headed into it', () => {
    const packages = [
      { id: 'A', packageDestId: null },
      { id: 'B', packageDestId: 'A' },
      { id: 'C', packageDestId: 'B' },
      { id: 'D', packageDestId: null },
    ];

    expect(packageDestinationDescendants('A', packages)).toEqual(new Set(['A', 'B', 'C']));
  });
});

describe('planUnpack', () => {
  it('frees the contained packages and the stock of the package', () => {
    expect(
      planUnpack({
        childIds: ['c1'],
        quants: [
          { id: 'q1', quantity: 3, reservedQuantity: 0 },
          { id: 'q0', quantity: 0, reservedQuantity: 0 },
        ],
      }),
    ).toEqual({
      kind: 'unpack',
      childIds: ['c1'],
      quantIds: ['q1'],
    });
  });

  it('refuses a package with nothing in it', () => {
    expect(planUnpack({ childIds: [], quants: [] })).toEqual({ kind: 'refuse', reason: NOTHING_TO_UNPACK });
  });

  it('refuses a package that holds a negative quantity, whatever else it holds', () => {
    expect(
      planUnpack({
        childIds: ['c1'],
        quants: [
          { id: 'q1', quantity: 3, reservedQuantity: 0 },
          { id: 'neg', quantity: -2, reservedQuantity: 0 },
        ],
      }),
    ).toEqual({ kind: 'refuse', reason: NEGATIVE_PACKAGE_UNPACK });
  });

  it('leaves a row that only holds a reservation out of the moves', () => {
    expect(planUnpack({ childIds: [], quants: [{ id: 'held', quantity: 0, reservedQuantity: 2 }] })).toEqual({
      kind: 'unpack',
      childIds: [],
      quantIds: [],
    });
  });
});

describe('planKeptContainers', () => {
  // Pallet P holds box B and q2; B holds q1. Container C holds only P.
  const packages = [
    { id: 'C', parentPackageId: null },
    { id: 'P', parentPackageId: 'C' },
    { id: 'B', parentPackageId: 'P' },
  ];
  const contentQuants = [
    { id: 'q1', packageId: 'B' },
    { id: 'q2', packageId: 'P' },
  ];

  it('keeps a package in its container when the whole container moves, up to the limit', () => {
    expect(
      planKeptContainers({ movedQuants: contentQuants, packages, contentQuants, limitIds: ['P'] }),
    ).toEqual(new Map([['B', 'P']]));
  });

  it('keeps every container whose whole content moves when there is no limit', () => {
    expect(planKeptContainers({ movedQuants: contentQuants, packages, contentQuants, limitIds: [] })).toEqual(
      new Map([
        ['B', 'P'],
        ['P', 'C'],
      ]),
    );
  });

  it('lets a package leave a container that keeps other stock', () => {
    expect(planKeptContainers({ movedQuants: [contentQuants[0]], packages, contentQuants, limitIds: [] })).toEqual(new Map());
  });
});
