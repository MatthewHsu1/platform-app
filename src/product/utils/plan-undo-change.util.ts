export type UndoableChange =
  | {
      kind:
        | 'lineCreated'
        | 'lineArchived'
        | 'lineDeleted'
        | 'lineValueLinkCreated'
        | 'lineValueLinkDeleted'
        | 'exclusionCreated'
        | 'exclusionLinkCreated';
      recordId: string;
    }
  | {
      kind: 'exclusionUpdated';
      recordId: string;
      before: { productTmplId: string | null; productTemplateAttributeValueId: string | null };
    };

export type UndoAction =
  | { recordId: string; action: 'destroy' | 'restore' }
  | { recordId: string; action: 'update'; data: Record<string, unknown> };

// A refused save is rolled back, so a created row never existed: it is destroyed
// (a soft delete would also read as a staff delete). A removed row comes back.
export const planUndoChange = (change: UndoableChange): UndoAction => {
  switch (change.kind) {
    case 'lineCreated':
    case 'exclusionCreated':
    case 'lineValueLinkCreated':
    case 'exclusionLinkCreated':
      return { recordId: change.recordId, action: 'destroy' };
    case 'lineDeleted':
    case 'lineValueLinkDeleted':
      return { recordId: change.recordId, action: 'restore' };
    case 'lineArchived':
      return { recordId: change.recordId, action: 'update', data: { active: true } };
    case 'exclusionUpdated':
      return { recordId: change.recordId, action: 'update', data: { ...change.before } };
  }
};

// Twenty saves an exclusion and its first values as separate requests, but
// they are one save. An exclusion made just before its refused value is the
// rest of that refused save. One that existed before is a save of its own,
// which is kept, so it stays even when the undo leaves it with no value.
const SAME_SAVE_SECONDS = 5;

export const isExclusionOfRefusedSave = ({
  exclusionCreatedAt,
  linkCreatedAt,
}: {
  exclusionCreatedAt: string;
  linkCreatedAt: string;
}) => Date.parse(linkCreatedAt) - Date.parse(exclusionCreatedAt) <= SAME_SAVE_SECONDS * 1_000;
