import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';
import { type SequenceRow } from 'src/stock/types/sequence-row.type';

type Trashable<TRow> = TRow & { deletedAt?: string | null };
type WarehouseLocationRow = { id: string; name: string | null; active: boolean; parentPath: string | null };

export type WarehouseRowOf = {
  locations: Trashable<WarehouseLocationRow>;
  sequences: Trashable<SequenceRow>;
  types: Trashable<PickingTypeRow>;
};
