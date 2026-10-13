import { type MoveState } from 'src/stock/types/move-state.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';
import { type RemovalMethod } from 'src/stock/removal/types/removal-method.type';
import { type OriginAvailability } from 'src/stock/utils/types/origin-availability.type';
import { type ReserveLine } from 'src/stock/utils/types/reserve-line.type';

export type ReserveMove = {
  id: string;
  productId: string;
  productUomId: string;
  productUomQty: number;
  quantity: number;
  state: MoveState;
  picked: boolean;
  procureMethod: ProcureMethod;
  locationId: string;
  locationParentPath: string | null;
  locationDestId: string | null;
  pickingId: string | null;
  packagingUomId: string | null;
  bypass: boolean;
  // When the move is planned to happen; stock to be removed before then cannot serve it.
  date?: string | null;
  // The operation type creates or uses lots: a serial product then gets one line per unit.
  usesLots?: boolean;
  // Removal strategies of the source location, then of each parent (none: first in, first out).
  removalMethodChain?: (RemovalMethod | null)[];
  // Moves fed by the same original moves share one pool of what those brought.
  originPoolKey: string | null;
  originAvailable: OriginAvailability[];
  lines: ReserveLine[];
};
