import { type defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { PICKING_FIELDS } from 'src/stock/page-layouts/field-ids';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns, PICKING_LIST_COLUMNS, viewPartId } from 'src/stock/views/list-columns';
import { STOCK_PICKING_ALL_FIELDS } from 'src/stock/views/object-fields';

type InGroup = { group?: string; positionInGroup?: number };

const filterBase = (view: string, field: string, inGroup: InGroup) => ({
  universalIdentifier: viewPartId(view, 'filter', field),
  fieldMetadataUniversalIdentifier: field,
  ...(inGroup.group === undefined
    ? {}
    : { viewFilterGroupUniversalIdentifier: inGroup.group, positionInViewFilterGroup: inGroup.positionInGroup ?? 0 }),
});

export const filterGroupId = (view: string, name: string): string => viewPartId(view, 'filter-group', name);

export const selectIs = (view: string, field: string, values: string[], inGroup: InGroup = {}) => ({
  ...filterBase(view, field, inGroup),
  operand: ViewFilterOperand.IS,
  value: values,
});

export const booleanIs = (view: string, field: string, value: boolean, inGroup: InGroup = {}) => ({
  ...filterBase(view, field, inGroup),
  operand: ViewFilterOperand.IS,
  value: value ? 'true' : 'false',
});

export const valueless = (
  view: string,
  field: string,
  operand: ViewFilterOperand.IS_NOT_EMPTY | ViewFilterOperand.IS_IN_PAST,
  inGroup: InGroup = {},
) => ({ ...filterBase(view, field, inGroup), operand, value: '' });

export const isCurrentMember = (view: string, field: string) => ({
  ...filterBase(view, field, {}),
  operand: ViewFilterOperand.IS,
  value: { isCurrentWorkspaceMemberSelected: true, selectedRecordIds: [] },
});

export const numberIsNot = (view: string, field: string, value: number) => ({
  ...filterBase(view, field, {}),
  operand: ViewFilterOperand.IS_NOT,
  value: String(value),
});

// A filter on a field of the related record, e.g. the usage of a quant's
// location. Its id names the target field too, so one view can test two
// fields of the same related record.
const relatedBase = (view: string, relationField: string, targetField: string) => ({
  universalIdentifier: viewPartId(view, 'filter', `${relationField}>${targetField}`),
  fieldMetadataUniversalIdentifier: relationField,
  relationTargetFieldMetadataUniversalIdentifier: targetField,
});

export const relatedIs = (view: string, relationField: string, targetField: string, value: string[] | 'true' | 'false') => ({
  ...relatedBase(view, relationField, targetField),
  operand: ViewFilterOperand.IS,
  value,
});

export const relatedIsNotEmpty = (view: string, relationField: string, targetField: string) => ({
  ...relatedBase(view, relationField, targetField),
  operand: ViewFilterOperand.IS_NOT_EMPTY,
  value: '',
});

export const sortBy = (view: string, field: string, direction: ViewSortDirection) => ({
  universalIdentifier: viewPartId(view, 'sort', field),
  fieldMetadataUniversalIdentifier: field,
  direction,
});

export const OPEN_PICKING_STATES: string[] = [PICKING_STATE.ASSIGNED, PICKING_STATE.WAITING, PICKING_STATE.CONFIRMED];

type ViewDefinition = Parameters<typeof defineView>[0];

// A saved list of transfers: the transfer list columns, the view's own filters,
// and the transfers' first sort key, most urgent first.
export const transferView = ({
  universalIdentifier,
  name,
  icon,
  position,
  filters,
  filterGroups,
}: {
  universalIdentifier: string;
  name: string;
  icon: string;
  position: number;
  filters: ViewDefinition['filters'];
  filterGroups?: ViewDefinition['filterGroups'];
}): ViewDefinition => ({
  universalIdentifier,
  name,
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon,
  position,
  fields: listColumns(universalIdentifier, PICKING_LIST_COLUMNS, STOCK_PICKING_ALL_FIELDS),
  filters,
  ...(filterGroups === undefined ? {} : { filterGroups }),
  sorts: [sortBy(universalIdentifier, PICKING_FIELDS.priority, ViewSortDirection.DESC)],
});
