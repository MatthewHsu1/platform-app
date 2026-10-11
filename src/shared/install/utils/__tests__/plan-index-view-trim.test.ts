import { describe, expect, it } from 'vitest';

import { planIndexViewTrim, settleIndexViewTrim } from 'src/shared/install/utils/plan-index-view-trim.util';

const visibleFields = (count: number) =>
  Array.from({ length: count }, (_, position) => ({ fieldId: `field-${position}`, position, isVisible: true }));

const idsOf = (fields: { fieldId: string }[]) => fields.map((field) => field.fieldId);

describe('planIndexViewTrim', () => {
  it('hides every column after the first ten of a new list and remembers them all', () => {
    const fields = visibleFields(14);

    const plan = planIndexViewTrim({ fields, handled: [] });

    expect(plan.hide).toEqual(['field-10', 'field-11', 'field-12', 'field-13']);
    expect([...plan.handled].sort()).toEqual(idsOf(fields).sort());
  });

  it('hides a field added later when ten columns already show', () => {
    const handledFields = visibleFields(10);
    const added = { fieldId: 'field-new', position: 14, isVisible: true };

    const plan = planIndexViewTrim({ fields: [...handledFields, added], handled: idsOf(handledFields) });

    expect(plan.hide).toEqual(['field-new']);
    expect(plan.handled).toContain('field-new');
  });

  it('leaves a column staff switched back on', () => {
    const fields = visibleFields(11);

    const plan = planIndexViewTrim({ fields, handled: idsOf(fields) });

    expect(plan.hide).toEqual([]);
  });

  it('keeps a new field visible while fewer than ten columns show', () => {
    const shown = visibleFields(8);
    const hidden = { fieldId: 'field-hidden', position: 8, isVisible: false };
    const added = [
      { fieldId: 'field-a', position: 21, isVisible: true },
      { fieldId: 'field-b', position: 20, isVisible: true },
      { fieldId: 'field-c', position: 22, isVisible: true },
    ];

    const plan = planIndexViewTrim({ fields: [...shown, hidden, ...added], handled: idsOf([...shown, hidden]) });

    expect(plan.hide).toEqual(['field-c']);
  });
});

describe('a trim stopped by its time limit', () => {
  it('remembers only the columns it reached, and the next run hides the rest', () => {
    const fields = visibleFields(14);
    const plan = planIndexViewTrim({ fields, handled: [] });

    const stopped = settleIndexViewTrim({ plan, hidden: ['field-10'] });

    expect(stopped.left).toEqual(['field-11', 'field-12', 'field-13']);
    expect([...stopped.handled].sort()).toEqual(
      idsOf(fields)
        .filter((id) => !['field-11', 'field-12', 'field-13'].includes(id))
        .sort(),
    );

    const afterFirstRun = fields.map((field) => (field.fieldId === 'field-10' ? { ...field, isVisible: false } : field));
    const resumed = planIndexViewTrim({ fields: afterFirstRun, handled: stopped.handled });

    expect(resumed.hide).toEqual(['field-11', 'field-12', 'field-13']);
    expect(settleIndexViewTrim({ plan: resumed, hidden: resumed.hide })).toEqual({
      handled: resumed.handled,
      left: [],
    });
  });

  it('leaves the memory as it was when the time ran out before the first column', () => {
    const handledFields = visibleFields(10);
    const added = [
      { fieldId: 'field-a', position: 10, isVisible: true },
      { fieldId: 'field-b', position: 11, isVisible: true },
    ];
    const plan = planIndexViewTrim({ fields: [...handledFields, ...added], handled: idsOf(handledFields) });

    expect(settleIndexViewTrim({ plan, hidden: [] })).toEqual({
      handled: idsOf(handledFields),
      left: ['field-a', 'field-b'],
    });
  });
});
