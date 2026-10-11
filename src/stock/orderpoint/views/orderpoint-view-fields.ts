import { STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

const COLUMNS = [
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

type ColumnPartIds = Record<(typeof COLUMNS)[number][0], string>;

// The columns of both reordering rule lists, in order. Whether the app made a
// row is not shown: nobody can change it.
export const orderpointViewFields = (partIds: ColumnPartIds) =>
  COLUMNS.map(([part, field], position) => ({
    universalIdentifier: partIds[part],
    fieldMetadataUniversalIdentifier: FIELD_IDS[field],
    position,
    isVisible: true,
  }));
