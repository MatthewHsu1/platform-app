import { defineView, ViewType } from 'twenty-sdk/define';

import { QUANT_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import {
  internalLocationsOnly,
  PHYSICAL_INVENTORY_COLUMNS,
  PHYSICAL_INVENTORY_SORTS,
} from 'src/stock/views/physical-inventory.view';
import { isCurrentMember } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.myCounts;

export default defineView({
  universalIdentifier: VIEW,
  name: 'My Counts',
  objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconUserCheck',
  position: 3,
  filters: [internalLocationsOnly(VIEW), isCurrentMember(VIEW, F.assignedUser)],
  sorts: PHYSICAL_INVENTORY_SORTS(VIEW),
  fields: PHYSICAL_INVENTORY_COLUMNS(VIEW),
});
