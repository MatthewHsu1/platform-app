import { defineView } from 'twenty-sdk/define';

import { PICKING_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { selectIs, transferView } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.ready;

export default defineView(
  transferView({
    universalIdentifier: VIEW,
    name: 'Ready',
    icon: 'IconCircleCheck',
    position: 4,
    filters: [selectIs(VIEW, F.state, [PICKING_STATE.ASSIGNED])],
  }),
);
