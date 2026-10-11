import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { LOCATION_FIELDS, QUANT_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_QUANT_ALL_FIELDS } from 'src/stock/views/object-fields';
import { numberIsNot, relatedIs, relatedIsNotEmpty, sortBy } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.quantLocations;

// Stock in the warehouses' own locations. Package, lot and owner columns are
// for setups that track them, so they start hidden.
export default defineView({
  universalIdentifier: VIEW,
  name: 'Locations',
  objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMapPin',
  position: 1,
  filters: [
    relatedIs(VIEW, F.location, LOCATION_FIELDS.usage, [LOCATION_USAGE.INTERNAL]),
    relatedIsNotEmpty(VIEW, F.location, LOCATION_FIELDS.warehouse),
    numberIsNot(VIEW, F.quantity, 0),
  ],
  sorts: [sortBy(VIEW, F.location, ViewSortDirection.ASC)],
  fields: listColumns(
    VIEW,
    [F.name, F.location, F.product, F.quantity, F.reservedQuantity],
    STOCK_QUANT_ALL_FIELDS,
  ),
});
