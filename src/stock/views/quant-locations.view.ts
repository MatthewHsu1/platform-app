import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { QUANT_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_QUANT_ALL_FIELDS } from 'src/stock/views/object-fields';
import { numberIsNot, sortBy } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.quantLocations;

export default defineView({
  universalIdentifier: VIEW,
  name: 'Locations',
  objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMapPin',
  position: 1,
  filters: [numberIsNot(VIEW, F.quantity, 0)],
  sorts: [sortBy(VIEW, F.location, ViewSortDirection.ASC)],
  fields: listColumns(
    VIEW,
    [F.name, F.location, F.product, F.package, F.lot, F.owner, F.quantity, F.reservedQuantity],
    STOCK_QUANT_ALL_FIELDS,
  ),
});
