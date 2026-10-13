import { describe, expect, it } from 'vitest';

import { isExclusionOfRefusedSave, planUndoChange } from 'src/product/utils/plan-undo-change.util';

// The whole save is refused when no possible variant is left; each change is undone by its opposite.
describe('planUndoChange', () => {
  it('removes a new exclusion and a new excluded value for good', () => {
    expect(planUndoChange({ kind: 'exclusionCreated', recordId: 'x' })).toEqual({
      recordId: 'x',
      action: 'destroy',
    });
    expect(planUndoChange({ kind: 'exclusionLinkCreated', recordId: 'xl' })).toEqual({
      recordId: 'xl',
      action: 'destroy',
    });
  });

  it('puts back an exclusion that was pointed elsewhere', () => {
    expect(
      planUndoChange({
        kind: 'exclusionUpdated',
        recordId: 'x',
        before: { productTmplId: 'shirt', productTemplateAttributeValueId: 'Red' },
      }),
    ).toEqual({
      recordId: 'x',
      action: 'update',
      data: { productTmplId: 'shirt', productTemplateAttributeValueId: 'Red' },
    });
  });

  it('brings back a value taken off a line, and removes one put on it', () => {
    expect(planUndoChange({ kind: 'lineValueLinkDeleted', recordId: 'l' })).toEqual({
      recordId: 'l',
      action: 'restore',
    });
    expect(planUndoChange({ kind: 'lineValueLinkCreated', recordId: 'l' })).toEqual({
      recordId: 'l',
      action: 'destroy',
    });
  });

  it('unarchives an archived line, restores a deleted one and removes a new one for good', () => {
    expect(planUndoChange({ kind: 'lineArchived', recordId: 'line' })).toEqual({
      recordId: 'line',
      action: 'update',
      data: { active: true },
    });
    expect(planUndoChange({ kind: 'lineDeleted', recordId: 'line' })).toEqual({
      recordId: 'line',
      action: 'restore',
    });
    expect(planUndoChange({ kind: 'lineCreated', recordId: 'line' })).toEqual({
      recordId: 'line',
      action: 'destroy',
    });
  });
});

describe('isExclusionOfRefusedSave', () => {
  it('takes an exclusion saved together with its refused value', () => {
    expect(
      isExclusionOfRefusedSave({
        exclusionCreatedAt: '2026-10-08T10:00:00.000Z',
        linkCreatedAt: '2026-10-08T10:00:00.400Z',
      }),
    ).toBe(true);
  });

  it('keeps an exclusion saved on its own before the refused value', () => {
    expect(
      isExclusionOfRefusedSave({
        exclusionCreatedAt: '2026-10-08T09:00:00.000Z',
        linkCreatedAt: '2026-10-08T10:00:00.000Z',
      }),
    ).toBe(false);
  });
});
