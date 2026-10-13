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
