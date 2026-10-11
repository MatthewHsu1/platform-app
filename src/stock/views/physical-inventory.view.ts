import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { LOCATION_FIELDS, QUANT_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_QUANT_ALL_FIELDS } from 'src/stock/views/object-fields';
import { relatedIs, sortBy } from 'src/stock/views/view-helpers';

// The owner column is left out to keep ten columns: the counted quantity and
// the difference matter more when counting, and staff can show the owner.
export const PHYSICAL_INVENTORY_COLUMNS = (viewUniversalIdentifier: string) =>
  listColumns(
    viewUniversalIdentifier,
    [
      F.name,
      F.location,
      F.product,
      F.lot,
      F.package,
      F.inventoryDate,
      F.assignedUser,
      F.quantity,
      F.inventoryQuantity,
      F.inventoryDiffQuantity,
    ],
    STOCK_QUANT_ALL_FIELDS,
  );

// Twenty keeps no order between the sorts of a view, so a second sort could
// win over the location: the list sorts by location only.
export const PHYSICAL_INVENTORY_SORTS = (viewUniversalIdentifier: string) => [
  sortBy(viewUniversalIdentifier, F.location, ViewSortDirection.ASC),
];

export const internalLocationsOnly = (viewUniversalIdentifier: string) =>
  relatedIs(viewUniversalIdentifier, F.location, LOCATION_FIELDS.usage, [LOCATION_USAGE.INTERNAL, LOCATION_USAGE.TRANSIT]);

const VIEW = VIEWS.physicalInventory;

export default defineView({
  universalIdentifier: VIEW,
  name: 'Physical Inventory',
  objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconListCheck',
  position: 2,
  filters: [internalLocationsOnly(VIEW)],
  sorts: PHYSICAL_INVENTORY_SORTS(VIEW),
  fields: PHYSICAL_INVENTORY_COLUMNS(VIEW),
});
