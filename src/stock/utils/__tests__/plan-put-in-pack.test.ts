import { describe, expect, it } from 'vitest';

import {
  outermostPackage,
  PACK_DIFFERENT_TYPES,
  packageChoiceIds,
  planPackageDestChange,
  planPutInPack,
  singleOperationType,
} from 'src/stock/utils/plan-put-in-pack.util';
import { type PackAnswer } from 'src/stock/utils/types/pack-answer.type';
import { type PackLine } from 'src/stock/utils/types/pack-line.type';

const noAnswer: PackAnswer = { packageId: null, packageTypeId: null, packageName: null, fromPackageWizard: false };
const line = (fields: Partial<PackLine>): PackLine => ({
  id: 'l1',
  pickingTypeId: 'in',
  state: 'ASSIGNED',
  quantity: 5,
  picked: true,
  resultPackageId: null,
  locationDestId: 'shelf1',
  packagingPackageTypeId: null,
  ...fields,
});
const flat = (packageId: string) => packageId;

describe('planPutInPack', () => {
  it('asks for one destination when the lines go to several', () => {
    expect(
      planPutInPack({
        lines: [line({ id: 'b', locationDestId: 'shelf2' }), line({ id: 'a2' }), line({ id: 'a1', resultPackageId: 'pack1' })],
        explicitPackageIds: [],
        outermostOf: flat,
        setPackageType: false,
        answer: noAnswer,
      }),
    ).toEqual({ kind: 'askDestination', lineIds: ['b', 'a2'], locationDestIds: ['shelf2', 'shelf1'] });
  });

  it('packs only the selected lines into a new package', () => {
    expect(
      planPutInPack({
        lines: ['s1', 's2', 's3'].map((id) => line({ id, picked: false, quantity: 1 })),
        explicitPackageIds: [],
        outermostOf: flat,
        setPackageType: false,
        answer: noAnswer,
      }),
    ).toEqual({ kind: 'packLines', lineIds: ['s1', 's2', 's3'], target: { kind: 'new', packageTypeId: null, name: null }, singleLine: false });
  });

  it('keeps only picked lines once one is picked, and skips empty or done lines', () => {
    const plan = planPutInPack({
      lines: [line({ id: 'p' }), line({ id: 'u', picked: false }), line({ id: 'z', quantity: 0 }), line({ id: 'd', state: 'DONE' })],
      explicitPackageIds: [],
      outermostOf: flat,
      setPackageType: false,
      answer: noAnswer,
    });

    expect(plan).toEqual({ kind: 'packLines', lineIds: ['p'], target: { kind: 'new', packageTypeId: null, name: null }, singleLine: true });
  });

  it('refuses lines of transfers with different operation types', () => {
    expect(
      planPutInPack({ lines: [line({}), line({ id: 'x', pickingTypeId: 'out' })], explicitPackageIds: [], outermostOf: flat, setPackageType: false, answer: noAnswer }),
    ).toEqual({ kind: 'refuse', reason: PACK_DIFFERENT_TYPES });
  });

  it('opens the Put in Pack pop-up when the type sets package types and nothing was chosen', () => {
    expect(planPutInPack({ lines: [line({})], explicitPackageIds: [], outermostOf: flat, setPackageType: true, answer: noAnswer })).toEqual({
      kind: 'askPackage',
      lineIds: ['l1'],
      packageIds: [],
      defaultLocationDestId: 'shelf1',
    });
    expect(
      planPutInPack({
        lines: [line({})],
        explicitPackageIds: [],
        outermostOf: flat,
        setPackageType: true,
        answer: { ...noAnswer, fromPackageWizard: true, packageTypeId: 'box' },
      }),
    ).toEqual({ kind: 'packLines', lineIds: ['l1'], target: { kind: 'new', packageTypeId: 'box', name: null }, singleLine: true });
  });

  it('does not open the pop-up when a package name is given', () => {
    expect(
      planPutInPack({ lines: [line({})], explicitPackageIds: [], outermostOf: flat, setPackageType: true, answer: { ...noAnswer, packageName: 'Smol' } }),
    ).toEqual({ kind: 'packLines', lineIds: ['l1'], target: { kind: 'new', packageTypeId: null, name: 'Smol' }, singleLine: true });
  });

  it("takes the package type of the move's packaging unit when there is exactly one", () => {
    expect(
      planPutInPack({ lines: [line({ packagingPackageTypeId: 'crate' })], explicitPackageIds: [], outermostOf: flat, setPackageType: false, answer: noAnswer }),
    ).toMatchObject({ target: { kind: 'new', packageTypeId: 'crate', name: null } });
    expect(
      planPutInPack({
        lines: [line({ packagingPackageTypeId: 'crate' }), line({ id: 'l2', packagingPackageTypeId: 'box' })],
        explicitPackageIds: [],
        outermostOf: flat,
        setPackageType: false,
        answer: noAnswer,
      }),
    ).toMatchObject({ target: { kind: 'new', packageTypeId: null, name: null } });
  });

  it('packs the outermost packages of lines that are all packed already', () => {
    expect(
      planPutInPack({
        lines: [line({ id: 'a', resultPackageId: 'box1' }), line({ id: 'b', resultPackageId: 'box2' })],
        explicitPackageIds: [],
        outermostOf: (packageId) => (packageId === 'box1' || packageId === 'box2' ? 'pallet' : packageId),
        setPackageType: false,
        answer: { ...noAnswer, packageName: 'Container' },
      }),
    ).toEqual({ kind: 'packPackages', packageIds: ['pallet'], target: { kind: 'new', packageTypeId: null, name: 'Container' } });
  });

  it('puts chosen packages into an existing package', () => {
    expect(
      planPutInPack({ lines: [], explicitPackageIds: ['smol'], outermostOf: flat, setPackageType: false, answer: { ...noAnswer, packageId: 'mid' } }),
    ).toEqual({ kind: 'packPackages', packageIds: ['smol'], target: { kind: 'existing', packageId: 'mid' } });
  });

  it('finds nothing to pack when no line has a quantity left', () => {
    expect(
      planPutInPack({ lines: [line({ quantity: 0 }), line({ id: 'c', state: 'CANCEL' })], explicitPackageIds: [], outermostOf: flat, setPackageType: false, answer: noAnswer }),
    ).toEqual({ kind: 'nothing' });
  });
});

describe('singleOperationType', () => {
  it('names the operation type only when the lines share exactly one', () => {
    expect(singleOperationType(['in', 'in', null])).toBe('in');
    expect(singleOperationType(['in', 'out'])).toBeNull();
    expect(singleOperationType([null])).toBeNull();
  });
});

describe('outermostPackage', () => {
  it('follows the destination containers to the top', () => {
    const packages = [
      { id: 'smol', packageDestId: 'mid' },
      { id: 'mid', packageDestId: 'big' },
      { id: 'big', packageDestId: null },
    ];

    expect(outermostPackage('smol', packages)).toBe('big');
    expect(outermostPackage('loose', packages)).toBe('loose');
  });
});

describe('planPackageDestChange', () => {
  it('heads the packages into the new package and frees containers left without lines', () => {
    expect(
      planPackageDestChange({
        packages: [
          { id: 'box1', packageDestId: 'pallet' },
          { id: 'box2', packageDestId: 'pallet' },
          { id: 'pallet', packageDestId: 'container' },
          { id: 'container', packageDestId: null },
          { id: 'better', packageDestId: null },
        ],
        movedIds: ['box1', 'box2'],
        targetId: 'better',
        openLineResultPackageIds: new Set(['box1', 'box2']),
      }),
    ).toEqual({ setDest: ['box1', 'box2'], clearDest: ['pallet'] });
  });

  it('keeps the inner packages in place when their container goes into a bigger one', () => {
    expect(
      planPackageDestChange({
        packages: [
          { id: 'smol', packageDestId: 'mid' },
          { id: 'mid', packageDestId: null },
          { id: 'big', packageDestId: null },
        ],
        movedIds: ['mid'],
        targetId: 'big',
        openLineResultPackageIds: new Set(['smol', 'mid', 'big']),
      }),
    ).toEqual({ setDest: ['mid'], clearDest: [] });
  });
});

describe('packageChoiceIds', () => {
  const packages = [
    { id: 'here', packageTypeId: 'box', locationId: 'shelf1' },
    { id: 'elsewhere', packageTypeId: 'box', locationId: 'shelf2' },
    { id: 'pallet-here', packageTypeId: 'pallet', locationId: 'shelf1' },
    { id: 'unused', packageTypeId: 'box', locationId: null },
    { id: 'going-elsewhere', packageTypeId: 'box', locationId: null },
    { id: 'going-here', packageTypeId: 'box', locationId: null },
    { id: 'outer-going-here', packageTypeId: 'box', locationId: null },
    { id: 'origin', packageTypeId: 'box', locationId: 'shelf2' },
  ];
  const input = {
    packages,
    headed: [{ id: 'inner', packageDestId: 'outer-going-here' }],
    openLines: [
      { resultPackageId: 'going-elsewhere', locationDestId: 'shelf2' },
      { resultPackageId: 'going-here', locationDestId: 'shelf1' },
      { resultPackageId: 'inner', locationDestId: 'shelf1' },
    ],
    locationDestId: 'shelf1',
    originPackageIds: ['origin'],
  };

  it('offers the packages of the chosen type in the destination, around the packed ones, or empty ones on their way there', () => {
    expect(packageChoiceIds({ ...input, packageTypeId: 'box' })).toEqual(['here', 'unused', 'going-here', 'outer-going-here', 'origin']);
  });

  it('offers every type when none is chosen', () => {
    expect(packageChoiceIds({ ...input, packageTypeId: null })).toEqual([
      'here',
      'pallet-here',
      'unused',
      'going-here',
      'outer-going-here',
      'origin',
    ]);
  });
});
