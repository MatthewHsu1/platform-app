import { STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';
import { keepColumnIds, listColumns } from 'src/stock/views/list-columns';
import { STOCK_WAREHOUSE_ORDERPOINT_ALL_FIELDS } from 'src/stock/views/object-fields';

const COLUMN_PARTS = [
  ['fieldProduct', 'product'],
  ['fieldLocation', 'location'],
  ['fieldWarehouse', 'warehouse'],
  ['fieldOnHand', 'qtyOnHand'],
  ['fieldForecast', 'qtyForecast'],
  ['fieldRoute', 'route'],
  ['fieldTrigger', 'trigger'],
  ['fieldMin', 'productMinQty'],
  ['fieldMax', 'productMaxQty'],
  ['fieldMultiple', 'replenishmentUom'],
  ['fieldToOrder', 'qtyToOrder'],
  ['fieldDeadline', 'deadlineDate'],
] as const;

type ColumnPartIds = Record<(typeof COLUMN_PARTS)[number][0], string>;
type OrderpointField = keyof typeof FIELD_IDS;

// The visible columns of a reordering rule list after the rule's name, every
// other field hidden.
export const orderpointViewFields = (viewUniversalIdentifier: string, partIds: ColumnPartIds, visible: OrderpointField[]) =>
  keepColumnIds(
    listColumns(
      viewUniversalIdentifier,
      [FIELD_IDS.name, ...visible.map((field) => FIELD_IDS[field])],
      STOCK_WAREHOUSE_ORDERPOINT_ALL_FIELDS,
    ),
    new Map(COLUMN_PARTS.map(([part, field]) => [FIELD_IDS[field], partIds[part]])),
  );
