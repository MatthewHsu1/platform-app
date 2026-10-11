import { getFieldUniversalIdentifier } from 'twenty-sdk/define';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { PICKING_FIELDS } from 'src/stock/page-layouts/field-ids';

const MAX_VISIBLE_COLUMNS = 10;
const SYSTEM_FIELDS = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

// Fields Twenty makes on every object have ids derived from the object and the field name.
export const systemField = (objectUniversalIdentifier: string, name: string): string =>
  getFieldUniversalIdentifier({
    applicationUniversalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
    objectUniversalIdentifier,
    name,
  });

// Every field a list of the object can show: its own fields, the fields other
// modules add to it, and the creation and update stamps.
export const allFields = (
  objectUniversalIdentifier: string,
  fieldUniversalIdentifiers: string[],
  otherSystemFields: string[] = [],
): string[] => [
  ...new Set([
    ...fieldUniversalIdentifiers,
    ...[...otherSystemFields, ...SYSTEM_FIELDS].map((name) => systemField(objectUniversalIdentifier, name)),
  ]),
];

// Too many columns slow the browser: a list shows at most ten, and every other
// field is a hidden column staff can switch on. Column ids depend only on the
// view and the field, so they stay the same on every install.
export const listColumns = (viewUniversalIdentifier: string, visible: string[], all: string[]) => {
  if (visible.length > MAX_VISIBLE_COLUMNS) {
    throw new Error(`A list shows at most ${MAX_VISIBLE_COLUMNS} columns (${viewUniversalIdentifier} has ${visible.length}).`);
  }
  const shown = [...new Set(visible)];
  const hidden = all.filter((fieldUniversalIdentifier) => !shown.includes(fieldUniversalIdentifier));

  return [...shown, ...new Set(hidden)].map((fieldMetadataUniversalIdentifier, position) => ({
    universalIdentifier: derivedId('view-field', viewUniversalIdentifier, fieldMetadataUniversalIdentifier),
    fieldMetadataUniversalIdentifier,
    position,
    isVisible: position < shown.length,
  }));
};

// Columns a list had before its ids were derived keep their ids: a universal
// id never changes once installed. Twenty checks a new label column against
// the old columns before it moves them, so the label goes below position 0.
export const keepColumnIds = <TColumn extends { universalIdentifier: string; fieldMetadataUniversalIdentifier: string; position: number }>(
  columns: TColumn[],
  idsByField: Map<string, string>,
): TColumn[] =>
  columns.map((column) => {
    const keptId = idsByField.get(column.fieldMetadataUniversalIdentifier);

    if (keptId !== undefined) {
      return { ...column, universalIdentifier: keptId };
    }

    return column.position === 0 ? { ...column, position: -1 } : column;
  });

// A sort or filter of a view gets an id from the view, its kind and its field, like a column.
export const viewPartId = (viewUniversalIdentifier: string, part: string, fieldUniversalIdentifier: string): string =>
  derivedId(`view-${part}`, viewUniversalIdentifier, fieldUniversalIdentifier);

// The transfer list columns, shared by every list of transfers. The company
// column is for multi-company setups only, so it starts hidden.
export const PICKING_LIST_COLUMNS: string[] = [
  PICKING_FIELDS.name,
  PICKING_FIELDS.priority,
  PICKING_FIELDS.location,
  PICKING_FIELDS.locationDest,
  PICKING_FIELDS.person,
  PICKING_FIELDS.scheduledDate,
  PICKING_FIELDS.origin,
  PICKING_FIELDS.batch,
  PICKING_FIELDS.state,
];
