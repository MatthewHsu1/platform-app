import { matchesFilter } from 'src/shared/filter-editor/matches-filter';
import { PICKING_TYPE_CODE, PRIORITY } from 'src/stock/stock-options.constant';
import { type PushFilterRecord } from 'src/stock/rule/types/push-filter-record.type';

type PushFilterFieldKind = 'number' | 'text' | 'date' | 'select';

// The fields a push rule may filter on; a dotted name reads one hop
// ("product.name").
export const PUSH_FILTER_FIELDS: { name: string; kind: PushFilterFieldKind; values?: string[] }[] = [
  { name: 'productUomQty', kind: 'number' },
  { name: 'quantity', kind: 'number' },
  { name: 'origin', kind: 'text' },
  { name: 'priority', kind: 'select', values: Object.values(PRIORITY) },
  { name: 'date', kind: 'date' },
  { name: 'product.name', kind: 'text' },
  { name: 'product.defaultCode', kind: 'text' },
  { name: 'product.barcode', kind: 'text' },
  { name: 'category.name', kind: 'text' },
  { name: 'category.completeName', kind: 'text' },
  { name: 'picking.name', kind: 'text' },
  { name: 'picking.origin', kind: 'text' },
  { name: 'picking.priority', kind: 'select', values: Object.values(PRIORITY) },
  { name: 'picking.pickingTypeCode', kind: 'select', values: Object.values(PICKING_TYPE_CODE) },
];

// A push rule applies to a move when its filter matches the move as read here.
export const matchesPushFilter = (pushDomain: unknown, move: PushFilterRecord) => matchesFilter(pushDomain, move);
