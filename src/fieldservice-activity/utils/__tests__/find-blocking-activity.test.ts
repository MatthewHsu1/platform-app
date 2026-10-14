import { describe, expect, it } from 'vitest';

import { type ActivityRow } from 'src/fieldservice-activity/types/activity-row.type';
import { findBlockingActivity } from 'src/fieldservice-activity/utils/find-blocking-activity.util';

const item = (id: string, overrides: Partial<ActivityRow> = {}): ActivityRow => ({
  id,
  name: id,
  required: false,
  sequence: 10,
  ref: null,
  state: 'TODO',
  createdAt: '2026-10-20T08:00:00.000Z',
  ...overrides,
});

describe('findBlockingActivity', () => {
  it('names the required item that is still to do', () => {
    const activities = [item('Activity 1'), item('Activity 2'), item('Activity 3', { required: true })];

    expect(findBlockingActivity(activities)?.name).toBe('Activity 3');
  });

  it('lets the order complete once the required item is done or cancelled', () => {
    expect(findBlockingActivity([item('Activity 3', { required: true, state: 'DONE' })])).toBeNull();
    expect(findBlockingActivity([item('Activity 3', { required: true, state: 'CANCEL' })])).toBeNull();
  });

  it('is not stopped by an optional item that is still to do', () => {
    expect(findBlockingActivity([item('Activity 1')])).toBeNull();
  });

  it('names the first required item in the checklist order', () => {
    const activities = [item('Late', { required: true, sequence: 30 }), item('Early', { required: true, sequence: 5 })];

    expect(findBlockingActivity(activities)?.name).toBe('Early');
  });
});
