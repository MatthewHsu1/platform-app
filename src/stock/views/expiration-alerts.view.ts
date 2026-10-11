import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { LOT_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { lotListColumns } from 'src/stock/views/lot-list-columns';
import { sortBy, valueless } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.expirationAlerts;

export default defineView({
  universalIdentifier: VIEW,
  name: 'Expiration Alerts',
  objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconAlertCircle',
  position: 1,
  filters: [valueless(VIEW, F.alertDate, ViewFilterOperand.IS_IN_PAST)],
  sorts: [sortBy(VIEW, F.name, ViewSortDirection.ASC)],
  fields: lotListColumns(VIEW),
});
