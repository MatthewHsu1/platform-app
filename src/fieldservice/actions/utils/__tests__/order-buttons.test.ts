import { describe, expect, it } from 'vitest';

import { holdsFieldServiceLevel } from 'src/fieldservice/actions/utils/holds-field-service-level.util';
import { planCancelOrder } from 'src/fieldservice/actions/utils/plan-cancel-order.util';
import { planCompleteOrder } from 'src/fieldservice/actions/utils/plan-complete-order.util';
import { planSignOrder } from 'src/fieldservice/actions/utils/plan-sign-order.util';

const NOW = '2026-10-20T15:30:00.000Z';

describe('planCompleteOrder', () => {
  it('moves an open order to Completed and stamps the actual end, and the start when empty', () => {
    expect(planCompleteOrder({ closedStatus: 'OPEN', dateStart: null }, NOW)).toEqual({
      kind: 'write',
      data: { stage: 'COMPLETED', closedStatus: 'COMPLETED', dateEnd: NOW, dateStart: NOW },
    });
  });

  it('keeps an actual start that is already set', () => {
    expect(planCompleteOrder({ closedStatus: 'OPEN', dateStart: '2026-10-20T13:00:00.000Z' }, NOW)).toEqual({
      kind: 'write',
      data: { stage: 'COMPLETED', closedStatus: 'COMPLETED', dateEnd: NOW },
    });
  });

  it('refuses a closed order', () => {
    expect(planCompleteOrder({ closedStatus: 'CANCELLED', dateStart: null }, NOW)).toEqual({ kind: 'refuse', reason: 'This order is already closed.' });
  });
});

describe('planCancelOrder', () => {
  it('moves an open order to Cancelled and refuses a closed one', () => {
    expect(planCancelOrder({ closedStatus: 'OPEN' })).toEqual({ kind: 'write', data: { stage: 'CANCELLED' } });
    expect(planCancelOrder({ closedStatus: 'COMPLETED' })).toEqual({ kind: 'refuse', reason: 'This order is already closed.' });
  });
});

describe('planSignOrder', () => {
  it('keeps the signer and the time on a completed order', () => {
    expect(planSignOrder({ closedStatus: 'COMPLETED', signedBy: ' Ana Diaz ' }, NOW)).toEqual({ kind: 'write', data: { signedBy: 'Ana Diaz', signedOn: NOW } });
  });

  it('refuses an open order and an empty name', () => {
    expect(planSignOrder({ closedStatus: 'OPEN', signedBy: 'Ana' }, NOW)).toEqual({ kind: 'refuse', reason: 'Only a completed order can be signed.' });
    expect(planSignOrder({ closedStatus: 'COMPLETED', signedBy: '  ' }, NOW)).toEqual({ kind: 'refuse', reason: 'Type the name of the person who signs.' });
  });
});

describe('holdsFieldServiceLevel', () => {
  it('counts a higher level as holding the lower one, and the admin as holding every level', () => {
    expect(holdsFieldServiceLevel({ isWorkspaceAdmin: false, blockKeys: ['fieldService.dispatcher'] }, 'fieldService.user')).toBe(true);
    expect(holdsFieldServiceLevel({ isWorkspaceAdmin: false, blockKeys: ['fieldService.userOwn'] }, 'fieldService.user')).toBe(false);
    expect(holdsFieldServiceLevel({ isWorkspaceAdmin: true, blockKeys: [] }, 'fieldService.manager')).toBe(true);
  });
});
