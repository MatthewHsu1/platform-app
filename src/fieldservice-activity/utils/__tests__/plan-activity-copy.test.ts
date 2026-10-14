import { describe, expect, it } from 'vitest';

import { type ActivityRow } from 'src/fieldservice-activity/types/activity-row.type';
import { planActivityCopy } from 'src/fieldservice-activity/utils/plan-activity-copy.util';

const item = (id: string, overrides: Partial<ActivityRow> = {}): ActivityRow => ({
  id,
  name: 'Activity new',
  required: true,
  sequence: 10,
  ref: 'Ref new',
  state: 'TODO',
  createdAt: '2026-10-20T08:00:00.000Z',
  ...overrides,
});

const NOTHING = { destroyIds: [], create: [] };

describe('planActivityCopy', () => {
  it('copies the name, the required flag and the reference of a template item onto a new order, to do', () => {
    expect(planActivityCopy({ templateId: 'tpl', templateChanged: true, templateActivities: [item('t1')], existing: [] })).toEqual({
      destroyIds: [],
      create: [{ name: 'Activity new', required: true, sequence: 10, ref: 'Ref new', state: 'TODO' }],
    });
  });

  it('makes one copy per template item, in the template order', () => {
    const plan = planActivityCopy({
      templateId: 'tpl',
      templateChanged: true,
      templateActivities: [item('t2', { name: 'Test run', sequence: 20 }), item('t1', { name: 'Check the belt', sequence: 10 })],
      existing: [],
    });

    expect(plan.create.map((copy) => copy.name)).toEqual(['Check the belt', 'Test run']);
  });

  it('drops the items the order had when another template is picked', () => {
    const plan = planActivityCopy({
      templateId: 'tpl',
      templateChanged: true,
      templateActivities: [item('t1', { name: 'Check the belt' })],
      existing: [item('o1', { name: 'Old item', state: 'DONE' }), item('o2', { name: 'Other old item' })],
    });

    expect(plan.destroyIds).toEqual(['o1', 'o2']);
    expect(plan.create.map((copy) => copy.name)).toEqual(['Check the belt']);
  });

  it('empties the checklist when the new template has no items', () => {
    expect(planActivityCopy({ templateId: 'tpl', templateChanged: true, templateActivities: [], existing: [item('o1')] })).toEqual({
      destroyIds: ['o1'],
      create: [],
    });
  });

  it('keeps the checklist when the template is cleared', () => {
    expect(planActivityCopy({ templateId: null, templateChanged: true, templateActivities: [], existing: [item('o1')] })).toEqual(NOTHING);
  });

  it('keeps the checklist of a save that did not change the template', () => {
    expect(planActivityCopy({ templateId: 'tpl', templateChanged: false, templateActivities: [item('t1')], existing: [] })).toEqual(NOTHING);
  });

  it('writes nothing when the order already holds the same items, so a second pass keeps their progress', () => {
    expect(
      planActivityCopy({ templateId: 'tpl', templateChanged: true, templateActivities: [item('t1')], existing: [item('o1', { state: 'DONE' })] }),
    ).toEqual(NOTHING);
  });
});
