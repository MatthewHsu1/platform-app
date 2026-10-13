import { defineView } from 'twenty-sdk/define';

import { PICKING_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { isCurrentMember, transferView } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.myTransfers;

export default defineView(
  transferView({
    universalIdentifier: VIEW,
    name: 'My Transfers',
    icon: 'IconUser',
    position: 8,
    filters: [isCurrentMember(VIEW, F.responsibleUser)],
  }),
);
