import { sameValue } from 'src/shared/utils/same-value.util';
import { type MoveLineTrackingUndo } from 'src/stock/utils/types/move-line-tracking-undo.type';

// Fields Twenty writes itself on every save; they are never put back.
const SYSTEM_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'position', 'searchVector']);

// The fields a save changed, in the form they are written back: a relation is written through its join column,
// so its object form is left out.
export const changedFieldsOf = ({
  before,
  after,
  updatedFields,
}: {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  updatedFields: string[];
}): string[] => {
  const listed =
    updatedFields.length > 0
      ? updatedFields
      : [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((field) => !sameValue(before[field], after[field]));

  return [...new Set(listed)].filter(
    (field) =>
      field in before &&
      !SYSTEM_FIELDS.has(field) &&
      !(typeof before[field] === 'object' && before[field] !== null && `${field}Id` in before),
  );
};

// A refused save is undone whole, as if it had never been made: a new line is destroyed (with a note on its
// transfer, else its move), an edit gets back every field it changed. An edit whose earlier values are not known
// is left alone.
export const planMoveLineTrackingUndo = ({
  operation,
  before,
  after,
  updatedFields,
}: {
  operation: 'created' | 'updated';
  before: Record<string, unknown> | undefined;
  after: Record<string, unknown> & { pickingId: string | null; moveId: string | null };
  updatedFields: string[];
}): MoveLineTrackingUndo => {
  if (operation === 'created') {
    if (after.pickingId !== null) {
      return { kind: 'destroy', noteOn: { objectSingular: 'stockPicking', recordId: after.pickingId } };
    }
    return { kind: 'destroy', noteOn: after.moveId === null ? null : { objectSingular: 'stockMove', recordId: after.moveId } };
  }
  if (before === undefined) {
    return { kind: 'none' };
  }

  return {
    kind: 'putBack',
    data: Object.fromEntries(changedFieldsOf({ before, after, updatedFields }).map((field) => [field, before[field]])),
  };
};
