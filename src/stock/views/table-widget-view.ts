import { type defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';

import { listColumns, viewPartId } from 'src/stock/views/list-columns';

type ViewFilter = NonNullable<Parameters<typeof defineView>[0]['filters']>[number];

// Twenty's marker for "the record the page shows".
const CURRENT_RECORD = JSON.stringify({ selectedRecordIds: [], isCurrentRecordSelected: true });

// A related table on a record page: its columns, and a filter that keeps only
// the rows that point at the page's record. A table over a link object, or two
// relations away, compares through the field of the related row that points
// at the page's record. `extraFilters` narrow it further: every filter holds.
export const tableWidgetView = ({
  universalIdentifier,
  name,
  objectUniversalIdentifier,
  visible,
  all,
  parentField,
  throughField,
  extraFilters = [],
}: {
  universalIdentifier: string;
  name: string;
  objectUniversalIdentifier: string;
  visible: string[];
  all: string[];
  parentField: string;
  throughField?: string;
  extraFilters?: ViewFilter[];
}) => ({
  universalIdentifier,
  name,
  objectUniversalIdentifier,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconTable',
  position: 0,
  fields: listColumns(universalIdentifier, visible, all),
  filters: [
    {
      universalIdentifier: viewPartId(universalIdentifier, 'filter', parentField),
      fieldMetadataUniversalIdentifier: parentField,
      operand: ViewFilterOperand.IS,
      value: CURRENT_RECORD,
      ...(throughField === undefined ? {} : { relationTargetFieldMetadataUniversalIdentifier: throughField }),
    },
    ...extraFilters,
  ],
});
