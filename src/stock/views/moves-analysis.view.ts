import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { MOVE_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_MOVE_ALL_FIELDS } from 'src/stock/views/object-fields';
import { selectIs, sortBy } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.movesAnalysis;

// The company column is for multi-company setups only, so it starts hidden.
export default defineView({
  universalIdentifier: VIEW,
  name: 'Moves Analysis',
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconChartBar',
  position: 1,
  filters: [selectIs(VIEW, F.state, [MOVE_STATE.DONE])],
  sorts: [sortBy(VIEW, F.date, ViewSortDirection.DESC)],
  fields: listColumns(
    VIEW,
    [
      F.name,
      F.date,
      F.reference,
      F.product,
      F.location,
      F.locationDest,
      F.productUomQty,
      F.quantity,
      F.productUom,
      F.state,
    ],
    STOCK_MOVE_ALL_FIELDS,
  ),
});
