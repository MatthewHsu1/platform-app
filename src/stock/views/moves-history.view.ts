import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { MOVE_LINE_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns, systemField } from 'src/stock/views/list-columns';
import { STOCK_MOVE_LINE_ALL_FIELDS } from 'src/stock/views/object-fields';
import { selectIs, sortBy } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.movesHistory;

// Newest lines first. The lot column is for setups that track lots, so it
// starts hidden.
export default defineView({
  universalIdentifier: VIEW,
  name: 'Moves History',
  objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconHistory',
  position: 1,
  filters: [selectIs(VIEW, F.state, [MOVE_STATE.DONE])],
  sorts: [sortBy(VIEW, systemField(STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER, 'createdAt'), ViewSortDirection.DESC)],
  fields: listColumns(
    VIEW,
    [F.name, F.date, F.product, F.location, F.locationDest, F.quantity, F.productUom, F.state],
    STOCK_MOVE_LINE_ALL_FIELDS,
  ),
});
