import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { LOT_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { lotListColumns } from 'src/stock/views/lot-list-columns';
import { sortBy } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.lotsByLocation;

export default defineView({
  universalIdentifier: VIEW,
  name: 'Lots by Location',
  objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMapPin',
  position: 2,
  sorts: [sortBy(VIEW, F.location, ViewSortDirection.ASC)],
  fields: lotListColumns(VIEW),
});
