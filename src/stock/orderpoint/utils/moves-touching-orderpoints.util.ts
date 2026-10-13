import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { sameValue } from 'src/shared/utils/same-value.util';
import { type MoveSnapshot } from 'src/stock/orderpoint/types/move-snapshot.type';

type MoveValues = Partial<MoveSnapshot> & Record<string, unknown>;

// Fields whose change moves a product's forecast.
const FORECAST_FIELDS = ['productId', 'state', 'date', 'productUomQty', 'locationId', 'locationDestId'];
// Fields whose change also leaves the rules of the old product and warehouses stale.
const WHERE_FIELDS = ['productId', 'locationId', 'locationDestId'];

const snapshot = (values: MoveValues | undefined): MoveSnapshot[] =>
  values === undefined || typeof values.productId !== 'string'
    ? []
    : [{ productId: values.productId, locationId: values.locationId ?? null, locationDestId: values.locationDestId ?? null }];

const changed = (before: MoveValues, after: MoveValues, fields: string[]) =>
  fields.some((field) => !sameValue(before[field], after[field]));

// The moves, as they were or are now, whose reordering rules need new numbers.
export const movesTouchingOrderpoints = (
  operation: RecordOperation,
  changes: { before?: MoveValues; after?: MoveValues }[],
): MoveSnapshot[] =>
  changes.flatMap(({ before, after }) => {
    if (operation === 'created' || operation === 'restored') {
      return snapshot(after);
    }
    if (operation === 'deleted' || operation === 'destroyed') {
      return snapshot(before);
    }
    if (operation !== 'updated' || before === undefined || after === undefined || !changed(before, after, FORECAST_FIELDS)) {
      return [];
    }
    return changed(before, after, WHERE_FIELDS) ? [...snapshot(after), ...snapshot(before)] : snapshot(after);
  });
