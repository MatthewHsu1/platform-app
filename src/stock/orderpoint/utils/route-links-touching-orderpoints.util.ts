import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { sameValue } from 'src/shared/utils/same-value.util';

type LinkValues = Record<string, unknown>;

// The route links, as they were or are now, whose change alters which routes supply reordering rules: a link made,
// removed, brought back, or pointed at another record. A link removed for good after it was deleted was counted at
// the delete.
export const routeLinksTouchingOrderpoints = (
  operation: RecordOperation,
  changes: { before?: LinkValues; after?: LinkValues }[],
  linkFields: string[],
): LinkValues[] =>
  changes.flatMap(({ before, after }) => {
    if (operation === 'created' || operation === 'restored') {
      return after === undefined ? [] : [after];
    }
    if (operation === 'deleted') {
      return before === undefined ? [] : [before];
    }
    if (operation === 'destroyed') {
      return before === undefined || typeof before.deletedAt === 'string' ? [] : [before];
    }
    if (operation !== 'updated' || before === undefined || after === undefined) {
      return [];
    }
    return linkFields.some((field) => !sameValue(before[field], after[field])) ? [before, after] : [];
  });
