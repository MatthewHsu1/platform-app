import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type ProductTracking } from 'src/stock/types/product-tracking.type';
import { type TrackingRefusal } from 'src/stock/utils/types/tracking-refusal.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export type MoveLineTrackingRefusalStore = {
  readLines: (lineIds: string[]) => Promise<MoveLineRow[]>;
  readLots: (lotIds: string[]) => Promise<{ id: string; name: string | null; productId: string | null }[]>;
  readProducts: (productIds: string[]) => Promise<Map<string, { displayName: string; tracking: ProductTracking; uomId: string }>>;
  uoms: () => Promise<Map<string, ResolvedUom>>;
  digits: () => number;
  putBack: (event: ObjectRecordEvent<MoveLineEventRecord>, data: Record<string, unknown>, refusal: TrackingRefusal) => Promise<void>;
  destroyWithNote: (
    event: ObjectRecordEvent<MoveLineEventRecord>,
    noteOn: { objectSingular: 'stockPicking' | 'stockMove'; recordId: string } | null,
    refusal: TrackingRefusal,
  ) => Promise<void>;
};
