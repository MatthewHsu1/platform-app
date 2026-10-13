import { describe, expect, it } from 'vitest';

import {
  NEGATIVE_PACKAGE_ADD,
  planAddEntirePacks,
  planDestForEntirePacks,
  planEntirePack,
  planEntirePackBreaks,
  planRemovePackage,
} from 'src/stock/utils/plan-entire-pack.util';
import { type EntirePackLine } from 'src/stock/utils/types/entire-pack-line.type';
import { type PackageContent } from 'src/stock/utils/types/package-content.type';

const pack = (fields: Partial<PackageContent> & { packageId: string }): PackageContent => ({
  parentPackageId: null,
  packageDestId: null,
  isReusable: false,
  descendantIds: [],
  childIds: [],
  quants: [],
  ...fields,
});
const line = (fields: Partial<EntirePackLine> & { id: string }): EntirePackLine => ({
  pickingId: 't1',
  packageId: null,
  resultPackageId: null,
  state: 'ASSIGNED',
  productId: 'A',
  lotId: null,
  quantityProductUom: 0,
  isStorable: true,
  isEntirePack: false,
  ...fields,
});

describe('planEntirePack', () => {
  it('moves a package whole when one transfer takes all of it', () => {
    const packages = new Map([['P', pack({ packageId: 'P', quants: [{ productId: 'A', lotId: null, quantity: 20 }] })]]);

    expect(planEntirePack({ lines: [line({ id: 'l', packageId: 'P', quantityProductUom: 20 })], packages, digits: 2 })).toEqual({
      lineUpdates: [{ id: 'l', resultPackageId: 'P', isEntirePack: true }],
      packageDestUpdates: [],
    });
  });

  it('leaves a package split between transfers alone', () => {
    const packages = new Map([['P', pack({ packageId: 'P', quants: [{ productId: 'A', lotId: null, quantity: 30 }] })]]);

    expect(planEntirePack({ lines: [line({ id: 'l', packageId: 'P', quantityProductUom: 10 })], packages, digits: 2 }).lineUpdates).toEqual([]);
    expect(
      planEntirePack({
        lines: [
          line({ id: 'l1', pickingId: 't1', packageId: 'P', quantityProductUom: 10 }),
          line({ id: 'l2', pickingId: 't2', packageId: 'P', quantityProductUom: 20 }),
        ],
        packages,
        digits: 2,
      }).lineUpdates,
    ).toEqual([]);
  });

  it('counts a package as covered when the transfer takes no storable product from it', () => {
    const packages = new Map([['P', pack({ packageId: 'P', quants: [{ productId: 'A', lotId: null, quantity: 20 }] })]]);

    expect(
      planEntirePack({ lines: [line({ id: 'l', packageId: 'P', productId: 'C', isStorable: false, quantityProductUom: 1 })], packages, digits: 2 })
        .lineUpdates,
    ).toEqual([{ id: 'l', resultPackageId: 'P', isEntirePack: true }]);
  });

  it('never treats lines with no transfer as one transfer', () => {
    const packages = new Map([['P', pack({ packageId: 'P', quants: [{ productId: 'A', lotId: null, quantity: 20 }] })]]);

    expect(
      planEntirePack({ lines: [line({ id: 'l', pickingId: null, packageId: 'P', quantityProductUom: 20 })], packages, digits: 2 }).lineUpdates,
    ).toEqual([]);
  });

  it('keeps a destination package a user chose, and never moves a reusable box whole', () => {
    const packages = new Map([
      ['P', pack({ packageId: 'P', quants: [{ productId: 'A', lotId: null, quantity: 100 }] })],
      ['N', pack({ packageId: 'N', quants: [{ productId: 'A', lotId: null, quantity: 20 }] })],
      ['R', pack({ packageId: 'R', isReusable: true, quants: [{ productId: 'A', lotId: null, quantity: 2 }] })],
    ]);

    expect(
      planEntirePack({
        lines: [
          line({ id: 'kept', packageId: 'P', resultPackageId: 'D1', quantityProductUom: 100 }),
          line({ id: 'new', packageId: 'N', quantityProductUom: 20 }),
          line({ id: 'tote', pickingId: 't2', packageId: 'R', quantityProductUom: 2 }),
        ],
        packages,
        digits: 2,
      }).lineUpdates,
    ).toEqual([{ id: 'new', resultPackageId: 'N', isEntirePack: true }]);
  });

  it('heads packages into their container once all of its packages move', () => {
    const packages = new Map([
      ['pallet', pack({ packageId: 'pallet', childIds: ['boxA', 'boxB'], descendantIds: ['boxA', 'boxB'] })],
      ['boxA', pack({ packageId: 'boxA', parentPackageId: 'pallet', quants: [{ productId: 'A', lotId: null, quantity: 1 }] })],
      ['boxB', pack({ packageId: 'boxB', parentPackageId: 'pallet', quants: [{ productId: 'B', lotId: null, quantity: 2 }] })],
    ]);

    expect(
      planEntirePack({
        lines: [
          line({ id: 'a', packageId: 'boxA', quantityProductUom: 1 }),
          line({ id: 'b', packageId: 'boxB', productId: 'B', quantityProductUom: 2 }),
        ],
        packages,
        digits: 2,
      }).packageDestUpdates,
    ).toEqual([
      { id: 'boxA', packageDestId: 'pallet' },
      { id: 'boxB', packageDestId: 'pallet' },
    ]);
  });

  it('heads a package all the way up when each container is taken whole', () => {
    const packages = new Map([
      ['p0', pack({ packageId: 'p0', childIds: ['p1'], descendantIds: ['p1', 'p2', 'p3'] })],
      ['p1', pack({ packageId: 'p1', parentPackageId: 'p0', childIds: ['p2'], descendantIds: ['p2', 'p3'] })],
      ['p2', pack({ packageId: 'p2', parentPackageId: 'p1', childIds: ['p3'], descendantIds: ['p3'] })],
      ['p3', pack({ packageId: 'p3', parentPackageId: 'p2', quants: [{ productId: 'A', lotId: null, quantity: 2 }] })],
    ]);

    expect(
      planEntirePack({ lines: [line({ id: 'l', packageId: 'p3', quantityProductUom: 2 })], packages, digits: 2 }).packageDestUpdates,
    ).toEqual([
      { id: 'p3', packageDestId: 'p2' },
      { id: 'p2', packageDestId: 'p1' },
      { id: 'p1', packageDestId: 'p0' },
    ]);
  });
});

describe('planDestForEntirePacks', () => {
  it('heads a lone package into its container only when the container itself was added', () => {
    const packages = new Map([
      ['container', pack({ packageId: 'container', childIds: ['pk'], descendantIds: ['pk'] })],
      ['pk', pack({ packageId: 'pk', parentPackageId: 'container' })],
    ]);

    expect(planDestForEntirePacks({ resultPackageIds: ['pk'], packages, allowedPackageIds: new Set(['pk']) })).toEqual([]);
    expect(planDestForEntirePacks({ resultPackageIds: ['pk'], packages, allowedPackageIds: new Set(['container', 'pk']) })).toEqual([
      { id: 'pk', packageDestId: 'container' },
    ]);
  });
});

describe('planEntirePackBreaks', () => {
  const packages = new Map([
    ['pack1', pack({ packageId: 'pack1', quants: [{ productId: 'A', lotId: null, quantity: 5 }, { productId: 'B', lotId: null, quantity: 3 }] })],
    ['pack2', pack({ packageId: 'pack2', quants: [{ productId: 'B', lotId: null, quantity: 1 }] })],
    ['pack3', pack({ packageId: 'pack3', quants: [{ productId: 'A', lotId: null, quantity: 2 }, { productId: 'B', lotId: null, quantity: 2 }] })],
  ]);
  const entire = (id: string, packageId: string, productId: string, quantity: number) =>
    line({ id, packageId, resultPackageId: packageId, productId, quantityProductUom: quantity, isEntirePack: true });

  it('clears every line of a package no longer moved whole', () => {
    expect(
      planEntirePackBreaks({
        lines: [entire('1a', 'pack1', 'A', 1), entire('1b', 'pack1', 'B', 3), entire('2b', 'pack2', 'B', 1), entire('3a', 'pack3', 'A', 2), entire('3b', 'pack3', 'B', 2)],
        packages,
        digits: 2,
      }),
    ).toEqual(['1a', '1b']);
  });

  it('clears the other line of a package after one of its lines is removed', () => {
    expect(planEntirePackBreaks({ lines: [entire('3b', 'pack3', 'B', 2)], packages, digits: 2 })).toEqual(['3b']);
  });

  it('clears a line whose destination package was changed', () => {
    expect(
      planEntirePackBreaks({
        lines: [{ ...entire('2b', 'pack2', 'B', 1), resultPackageId: 'other' }],
        packages,
        digits: 2,
      }),
    ).toEqual(['2b']);
  });
});

describe('planRemovePackage', () => {
  it('drops a whole-package line and its empty move, but only unhooks a container', () => {
    const packages = [
      { id: 'pack1', packageDestId: 'pack3' },
      { id: 'pack2', packageDestId: 'pack3' },
      { id: 'pack3', packageDestId: null },
    ];
    const openLines = [
      { id: 'LA', resultPackageId: 'pack1', isEntirePack: true, moveId: 'MA' },
      { id: 'LB', resultPackageId: 'pack2', isEntirePack: true, moveId: 'MB' },
    ];
    const moves = [
      { id: 'MA', productUomQty: 0, lineIds: ['LA'] },
      { id: 'MB', productUomQty: 2, lineIds: ['LB'] },
    ];

    expect(planRemovePackage({ packageIds: ['pack3'], packages, openLines, moves })).toEqual({
      deleteLineIds: [],
      clearResultLineIds: [],
      deleteMoveIds: [],
      clearDestIds: ['pack1', 'pack2'],
      putawayLineIds: ['LA', 'LB'],
    });
    expect(planRemovePackage({ packageIds: ['pack1'], packages: packages.map((row) => ({ ...row, packageDestId: null })), openLines, moves })).toEqual({
      deleteLineIds: ['LA'],
      clearResultLineIds: [],
      deleteMoveIds: ['MA'],
      clearDestIds: [],
      putawayLineIds: [],
    });
  });

  it('keeps a move that still has demand, and only unpacks a line a user packed', () => {
    const packages = [{ id: 'pack2', packageDestId: null }];
    const openLines = [
      { id: 'LB', resultPackageId: 'pack2', isEntirePack: true, moveId: 'MB' },
      { id: 'LC', resultPackageId: 'pack2', isEntirePack: false, moveId: 'MC' },
    ];

    expect(
      planRemovePackage({
        packageIds: ['pack2'],
        packages,
        openLines,
        moves: [
          { id: 'MB', productUomQty: 2, lineIds: ['LB'] },
          { id: 'MC', productUomQty: 0, lineIds: ['LC'] },
        ],
      }),
    ).toEqual({
      deleteLineIds: ['LB'],
      clearResultLineIds: ['LC'],
      deleteMoveIds: [],
      clearDestIds: [],
      putawayLineIds: ['LC'],
    });
  });

  it('keeps an empty move that has another line', () => {
    const plan = planRemovePackage({
      packageIds: ['pack1'],
      packages: [{ id: 'pack1', packageDestId: null }],
      openLines: [{ id: 'LA', resultPackageId: 'pack1', isEntirePack: true, moveId: 'MA' }],
      moves: [{ id: 'MA', productUomQty: 0, lineIds: ['LA', 'loose'] }],
    });

    expect(plan.deleteLineIds).toEqual(['LA']);
    expect(plan.deleteMoveIds).toEqual([]);
  });

  it('frees containers cut off from the lines', () => {
    const plan = planRemovePackage({
      packageIds: ['p2'],
      packages: [
        { id: 'p0', packageDestId: null },
        { id: 'p1', packageDestId: 'p0' },
        { id: 'p2', packageDestId: 'p1' },
        { id: 'p3', packageDestId: 'p2' },
      ],
      openLines: [{ id: 'L3', resultPackageId: 'p3', isEntirePack: true, moveId: 'M' }],
      moves: [{ id: 'M', productUomQty: 2, lineIds: ['L3'] }],
    });

    expect(new Set(plan.clearDestIds)).toEqual(new Set(['p3', 'p2', 'p1']));
    expect(plan.deleteLineIds).toEqual([]);
  });
});

describe('planAddEntirePacks', () => {
  const row = (fields: Partial<{ id: string; quantity: number; productId: string }> = {}) => ({
    id: 'q1',
    productId: 'A',
    productUomId: 'u',
    quantity: 20,
    locationId: 'shelf1',
    packageId: 'P',
    lotId: null,
    ownerId: null,
    ...fields,
  });

  it('makes one whole-package line per row of the packages', () => {
    expect(planAddEntirePacks({ quants: [row()], pickingId: 't', locationDestId: 'stock', digits: 2 })).toEqual({
      kind: 'lines',
      lines: [
        {
          quantId: 'q1',
          data: {
            productId: 'A',
            productUomId: 'u',
            quantity: 20,
            locationId: 'shelf1',
            locationDestId: 'stock',
            pickingId: 't',
            packageId: 'P',
            resultPackageId: 'P',
            lotId: null,
            ownerId: null,
          },
        },
      ],
    });
  });

  it('makes no line for a row that only holds a reservation', () => {
    expect(
      planAddEntirePacks({ quants: [row(), row({ id: 'q2', productId: 'B', quantity: 0 })], pickingId: 't', locationDestId: 'stock', digits: 2 }),
    ).toMatchObject({ kind: 'lines', lines: [{ quantId: 'q1' }] });
  });

  it('refuses packages that hold a negative quantity', () => {
    expect(
      planAddEntirePacks({ quants: [row(), row({ id: 'q2', quantity: -3 })], pickingId: 't', locationDestId: 'stock', digits: 2 }),
    ).toEqual({ kind: 'refuse', reason: NEGATIVE_PACKAGE_ADD });
  });
});
