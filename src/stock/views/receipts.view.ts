import { defineView } from 'twenty-sdk/define';

import { PICKING_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { selectIs, transferView } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.receipts;

export default defineView(
  transferView({
    universalIdentifier: VIEW,
    name: 'Receipts',
    icon: 'IconTruckDelivery',
    position: 1,
    filters: [selectIs(VIEW, F.pickingTypeCode, [PICKING_TYPE_CODE.INCOMING])],
  }),
);
