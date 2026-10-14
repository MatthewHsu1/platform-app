import { describe, expect, it } from 'vitest';

import { planActivityCancel } from 'src/fieldservice-activity/utils/plan-activity-cancel.util';
import { planActivityDone } from 'src/fieldservice-activity/utils/plan-activity-done.util';

const NOW = '2026-10-20T15:30:00.000Z';

describe('planActivityDone', () => {
  it('marks an item to do as completed, with when and by whom', () => {
    expect(planActivityDone({ state: 'TODO', fsmOrderId: 'order' }, NOW, 'member')).toEqual({
      kind: 'write',
      data: { completed: true, completedOn: NOW, completedById: 'member', state: 'DONE' },
    });
  });

  it('leaves the member out when no member stands behind the click', () => {
    expect(planActivityDone({ state: 'TODO', fsmOrderId: 'order' }, NOW, null)).toEqual({
      kind: 'write',
      data: { completed: true, completedOn: NOW, state: 'DONE' },
    });
  });

  it('refuses an item that is done or cancelled, and an item of a template', () => {
    const handled = { kind: 'refuse', reason: 'This activity is already completed or cancelled.' };

    expect(planActivityDone({ state: 'DONE', fsmOrderId: 'order' }, NOW, 'member')).toEqual(handled);
    expect(planActivityDone({ state: 'CANCEL', fsmOrderId: 'order' }, NOW, 'member')).toEqual(handled);
    expect(planActivityDone({ state: 'TODO', fsmOrderId: null }, NOW, 'member')).toEqual({
      kind: 'refuse',
      reason: 'Only an activity of a service order can be completed or cancelled.',
    });
  });
});

describe('planActivityCancel', () => {
  it('cancels an item to do and stamps nobody', () => {
    expect(planActivityCancel({ state: 'TODO', fsmOrderId: 'order' })).toEqual({ kind: 'write', data: { state: 'CANCEL' } });
  });

  it('refuses an item that is done or cancelled, and an item of a template', () => {
    expect(planActivityCancel({ state: 'DONE', fsmOrderId: 'order' })).toEqual({
      kind: 'refuse',
      reason: 'This activity is already completed or cancelled.',
    });
    expect(planActivityCancel({ state: 'TODO', fsmOrderId: null })).toEqual({
      kind: 'refuse',
      reason: 'Only an activity of a service order can be completed or cancelled.',
    });
  });
});
