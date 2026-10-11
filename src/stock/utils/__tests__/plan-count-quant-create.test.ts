import { describe, expect, it } from 'vitest';

import {
  NOT_STORABLE_REASON,
  planCountQuantCreate,
  VIEW_LOCATION_REASON,
} from 'src/stock/utils/plan-count-quant-create.util';

const NOW = '2026-10-08T10:00:00.000Z';
const created = (overrides: Record<string, unknown> = {}) => ({
  id: 'new', productId: 'p', locationId: 'stock', lotId: null as string | null, packageId: null as string | null, ownerId: null, inventoryQuantity: null as number | null,
  inventoryDate: null as string | null, assignedUserId: null as string | null, ...overrides,
});
const input = (overrides: Record<string, unknown> = {}) => ({
  created: created(),
  existing: null,
  isStorable: true,
  location: { usage: 'INTERNAL' as const, completeName: 'WH/Stock' },
  name: 'Bolt - WH/Stock',
  creatorMemberId: 'member-1',
  today: '2026-10-08',
  nextCountDate: '2026-12-31',
  now: NOW,
  digits: 2,
  ...overrides,
});

describe('planCountQuantCreate', () => {
  it('keeps a counted row on a new key with no stock and the count set', () => {
    expect(planCountQuantCreate(input({ created: created({ inventoryQuantity: 24 }) }))).toEqual({
      kind: 'keep',
      data: {
        quantKey: 'p|stock|||',
        name: 'Bolt - WH/Stock',
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        inDate: NOW,
        version: 0,
        isOutdated: false,
        inventoryQuantitySet: true,
        inventoryDiffQuantity: 24,
        inventoryDate: '2026-10-08',
        assignedUserId: 'member-1',
      },
    });
  });

  it('keeps the lot of a counted row in its key', () => {
    const plan = planCountQuantCreate(input({ created: created({ lotId: 'lot1', inventoryQuantity: 24 }) }));

    expect(plan.kind === 'keep' ? plan.data.quantKey : null).toBe('p|stock|lot1||');
  });

  it('keeps the package of a counted row in its key', () => {
    const plan = planCountQuantCreate(input({ created: created({ packageId: 'box', inventoryQuantity: 24 }) }));

    expect(plan.kind === 'keep' ? plan.data.quantKey : null).toBe('p|stock||box|');
  });

  it('puts the count on the row that already holds the key and drops the new row', () => {
    expect(
      planCountQuantCreate(
        input({ created: created({ inventoryQuantity: 24 }), existing: { id: 'old', quantity: 12 } }),
      ),
    ).toEqual({
      kind: 'merge',
      targetId: 'old',
      data: {
        inventoryQuantity: 24,
        inventoryQuantitySet: true,
        inventoryDiffQuantity: 12,
        isOutdated: false,
        inventoryDate: '2026-10-08',
        assignedUserId: 'member-1',
      },
      destroyId: 'new',
    });
  });

  it('keeps a row made without a count at quantity 0 with its next count date', () => {
    expect(planCountQuantCreate(input())).toEqual({
      kind: 'keep',
      data: {
        quantKey: 'p|stock|||',
        name: 'Bolt - WH/Stock',
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        inDate: NOW,
        version: 0,
        isOutdated: false,
        inventoryQuantitySet: false,
        inventoryDiffQuantity: 0,
        inventoryDate: '2026-12-31',
      },
    });
  });

  it('keeps the scheduled date and assignee a user typed on a row without a count', () => {
    const plan = planCountQuantCreate(
      input({ created: created({ inventoryDate: '2026-11-01', assignedUserId: 'member-2' }) }),
    );

    expect(plan).toMatchObject({ kind: 'keep', data: { inventoryDate: '2026-11-01' } });
    expect(plan.kind === 'keep' && 'assignedUserId' in plan.data).toBe(false);
  });

  it('drops a second row on an existing key when it carries no count', () => {
    expect(planCountQuantCreate(input({ existing: { id: 'old', quantity: 12 } }))).toEqual({
      kind: 'merge',
      targetId: 'old',
      data: {},
      destroyId: 'new',
    });
  });

  it('refuses a product that does not track inventory and a view location', () => {
    expect(planCountQuantCreate(input({ isStorable: false }))).toEqual({
      kind: 'refuse',
      reason: NOT_STORABLE_REASON,
      values: {},
    });
    expect(planCountQuantCreate(input({ location: { usage: 'VIEW' as const, completeName: 'WH' } }))).toEqual({
      kind: 'refuse',
      reason: VIEW_LOCATION_REASON,
      values: { location: 'WH' },
    });
  });
});
