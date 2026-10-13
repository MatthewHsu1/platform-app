import { type ProcurementWriteApi } from 'src/stock/procurement/types/procurement-write-api.type';
import { type PushLine } from 'src/stock/procurement/types/push-line.type';
import { type PutawayRequest } from 'src/stock/putaway/types/putaway-request.type';
import { type PushMove } from 'src/stock/utils/procurement/types/push-move.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';

type QuantDelta = (args: { key: string; delta: number; inDate: string | null }) => Promise<{ inDate: string | null }>;

// The reads and writes of a push run. The create and link calls make only the
// rows whose ids are not there yet.
export type PushStore = ProcurementWriteApi & {
  readRouting: (productIds: string[]) => Promise<{ data: RoutingData; products: Map<string, RoutingProduct> }>;
  // Only the moves that are done.
  readDoneMoves: (moveIds: string[]) => Promise<PushMove[]>;
  readLines: (moveId: string) => Promise<PushLine[]>;
  unlinkMoves: (moveOrigId: string, moveDestIds: string[]) => Promise<void>;
  makeToStock: (moveIds: string[]) => Promise<void>;
  recomputeMove: (moveIds: string[]) => Promise<void>;
  setLineDestination: (lineId: string, locationDestId: string) => Promise<void>;
  setMoveDestination: (moveId: string, values: { date: string; locationDestId: string }) => Promise<void>;
  applyQuantDelta: QuantDelta;
  settleQuantDelta: QuantDelta;
  recomputeProductQuantities: (productIds: string[]) => Promise<void>;
  recomputeTrackingForKeys: (keys: string[]) => Promise<void>;
  // Where stock arriving in each request's location is stored, keyed by the request's key.
  putawayDestinations: (requests: PutawayRequest[]) => Promise<Map<string, string>>;
};
