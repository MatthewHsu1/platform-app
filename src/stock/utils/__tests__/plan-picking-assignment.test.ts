import { describe, expect, it } from 'vitest';

import { pickAssignmentCandidate, planPickingAssignment } from 'src/stock/utils/plan-picking-assignment.util';
import { type AssignMove } from 'src/stock/utils/types/assign-move.type';
import { type OpenPicking } from 'src/stock/utils/types/open-picking.type';

const move = (id: string, overrides: Partial<AssignMove> = {}): AssignMove => ({
  id,
  productUomQty: 1,
  origin: null,
  companyId: null,
  personId: null,
  pickingTypeId: 'out',
  locationId: 'stock',
  locationDestId: 'customers',
  ...overrides,
});

const open = (id: string, overrides: Partial<OpenPicking> = {}): OpenPicking => ({
  id,
  origin: null,
  companyId: null,
  personId: null,
  priority: 'NORMAL',
  scheduledDate: '2026-10-08T10:00:00.000Z',
  createdAt: '2026-10-08T09:00:00.000Z',
  ...overrides,
});

describe('planPickingAssignment', () => {
  it('makes a new transfer with the shared contact and up to five origins', () => {
    const moves = ['A', 'B', 'C', 'D', 'E', 'F', 'A'].map((origin, index) =>
      move(`m${index}`, { origin, companyId: 'gym', personId: 'casey' }),
    );

    expect(planPickingAssignment({ moves, candidate: null })).toEqual({
      kind: 'create',
      moveIds: ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'],
      values: {
        origin: 'A,B,C,D,E...',
        companyId: 'gym',
        personId: 'casey',
        pickingTypeId: 'out',
        locationId: 'stock',
        locationDestId: 'customers',
      },
    });
  });

  it('leaves the contact empty when the moves do not share one', () => {
    const plan = planPickingAssignment({
      moves: [move('m1', { companyId: 'gym' }), move('m2', { companyId: 'club' })],
      candidate: null,
    });

    expect(plan.kind === 'create' && plan.values).toMatchObject({ companyId: null, personId: null, origin: null });
  });

  it('gives no new transfer to moves with a negative demand', () => {
    expect(planPickingAssignment({ moves: [move('neg', { productUomQty: -2 })], candidate: null })).toEqual({
      kind: 'skip',
    });
    const plan = planPickingAssignment({
      moves: [move('neg', { productUomQty: -2 }), move('pos', { productUomQty: 2 })],
      candidate: null,
    });
    expect(plan.kind === 'create' && plan.moveIds).toEqual(['pos']);
  });

  it('reuses the open transfer, clears a different contact and appends the new origin', () => {
    expect(
      planPickingAssignment({
        moves: [move('m1', { origin: 'SO2', companyId: 'club' })],
        candidate: open('p1', { origin: 'SO1', companyId: 'gym' }),
      }),
    ).toEqual({
      kind: 'reuse',
      pickingId: 'p1',
      moveIds: ['m1'],
      update: { companyId: null, personId: null, origin: 'SO1,SO2' },
    });
  });

  it('writes nothing on the reused transfer when contact and origin already match', () => {
    expect(
      planPickingAssignment({
        moves: [move('m1', { origin: 'SO1', companyId: 'gym' })],
        candidate: open('p1', { origin: 'SO1', companyId: 'gym' }),
      }),
    ).toEqual({ kind: 'reuse', pickingId: 'p1', moveIds: ['m1'], update: {} });
  });
});

describe('pickAssignmentCandidate', () => {
  it('prefers urgent, then the earliest scheduled date, then the newest', () => {
    const candidates = [
      open('late', { scheduledDate: '2026-10-09T10:00:00.000Z' }),
      open('early-old', { createdAt: '2026-10-01T00:00:00.000Z' }),
      open('early-new', { createdAt: '2026-10-05T00:00:00.000Z' }),
    ];

    expect(pickAssignmentCandidate(candidates)?.id).toBe('early-new');
    expect(pickAssignmentCandidate([...candidates, open('urgent', { priority: 'URGENT', scheduledDate: '2026-12-01T00:00:00.000Z' })])?.id).toBe('urgent');
    expect(pickAssignmentCandidate([])).toBeNull();
  });

  it('puts a transfer with no scheduled date after the ones that have one', () => {
    const candidates = [open('undated', { scheduledDate: null }), open('dated', { scheduledDate: '2026-12-01T00:00:00.000Z' })];

    expect(pickAssignmentCandidate(candidates)?.id).toBe('dated');
  });
});
