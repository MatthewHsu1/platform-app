import { describe, expect, it } from 'vitest';

import { planPackageSubtree, planPackageTypeSequence } from 'src/stock/utils/plan-package-tree.util';

describe('planPackageSubtree', () => {
  it('names each package from its outermost container down', () => {
    const { cycle, values } = planPackageSubtree({
      root: { id: 'p1', name: 'p1', parentPackageId: 'p0' },
      parent: { id: 'p0', completeName: 'p0', parentPath: 'p0/' },
      descendants: [
        { id: 'p2', name: 'p2', parentPackageId: 'p1' },
        { id: 'p3', name: 'p3', parentPackageId: 'p2' },
      ],
    });

    expect(cycle).toBe(false);
    expect(values.get('p3')).toEqual({ completeName: 'p0 > p1 > p2 > p3', parentPath: 'p0/p1/p2/p3/' });
    expect(values.get('p1')).toEqual({ completeName: 'p0 > p1', parentPath: 'p0/p1/' });
  });

  it('gives a package without container its own name', () => {
    expect(planPackageSubtree({ root: { id: 'a', name: 'Box', parentPackageId: null }, parent: null, descendants: [] }).values.get('a')).toEqual({
      completeName: 'Box',
      parentPath: 'a/',
    });
  });

  it('finds a container put inside one of its own packages', () => {
    expect(
      planPackageSubtree({
        root: { id: 'p0', name: 'p0', parentPackageId: 'p2' },
        parent: { id: 'p2', completeName: 'p0 > p1 > p2', parentPath: 'p0/p1/p2/' },
        descendants: [],
      }).cycle,
    ).toBe(true);
  });

  it('finds a package put inside itself', () => {
    expect(
      planPackageSubtree({
        root: { id: 'p0', name: 'p0', parentPackageId: 'p0' },
        parent: { id: 'p0', completeName: 'p0', parentPath: 'p0/' },
        descendants: [],
      }).cycle,
    ).toBe(true);
  });
});

describe('planPackageTypeSequence', () => {
  it('makes a sequence for a new type with a code', () => {
    expect(planPackageTypeSequence({ operation: 'created', beforeCode: null, sequenceCode: 'TBOX', referenceSequenceId: null })).toEqual({
      kind: 'create',
      sequence: { name: 'Package Type Sequence TBOX', code: 'TBOX', prefix: 'TBOX', padding: 7 },
    });
  });

  it('renames the existing sequence when the code changes, or makes one', () => {
    expect(planPackageTypeSequence({ operation: 'updated', beforeCode: 'TBOX', sequenceCode: 'BOX', referenceSequenceId: 's1' })).toEqual({
      kind: 'update',
      sequenceId: 's1',
      data: { name: 'Package Type Sequence BOX', code: 'BOX', prefix: 'BOX' },
    });
    expect(planPackageTypeSequence({ operation: 'updated', beforeCode: null, sequenceCode: 'TPAL', referenceSequenceId: null })).toEqual({
      kind: 'create',
      sequence: { name: 'Package Type Sequence TPAL', code: 'TPAL', prefix: 'TPAL', padding: 7 },
    });
  });

  it('does nothing for a type without a code, or an unchanged code', () => {
    expect(planPackageTypeSequence({ operation: 'created', beforeCode: null, sequenceCode: null, referenceSequenceId: null })).toEqual({ kind: 'none' });
    expect(planPackageTypeSequence({ operation: 'updated', beforeCode: 'X', sequenceCode: 'X', referenceSequenceId: 's1' })).toEqual({ kind: 'none' });
  });

  it('keeps the sequence a new type was saved with', () => {
    expect(planPackageTypeSequence({ operation: 'created', beforeCode: null, sequenceCode: 'TBOX', referenceSequenceId: 's1' })).toEqual({ kind: 'none' });
  });
});
