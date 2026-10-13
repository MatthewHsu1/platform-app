import { defineView, ViewFilterOperand } from 'twenty-sdk/define';

import { PICKING_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { OPEN_PICKING_STATES, selectIs, transferView, valueless } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.backorders;

export default defineView(
  transferView({
    universalIdentifier: VIEW,
    name: 'Backorders',
    icon: 'IconArrowsSplit2',
    position: 7,
    filters: [
      valueless(VIEW, F.backorder, ViewFilterOperand.IS_NOT_EMPTY),
      selectIs(VIEW, F.state, OPEN_PICKING_STATES),
    ],
  }),
);
