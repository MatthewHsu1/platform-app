import { type ReturnLinkMove } from 'src/stock/utils/types/return-link-move.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

// What a return reads about the done transfer: its moves, the move links around them and the returns already made.
export type ReturnData = {
  picking: PickingRow;
  // The transfer's rich-text note as read; the return keeps it.
  note: unknown;
  types: Map<string, PickingTypeRow>;
  moves: MoveRow[];
  productNames: Map<string, string>;
  locationUsage: Map<string, LocationUsage>;
  locationPath: Map<string, string | null>;
  graph: Map<string, ReturnLinkMove>;
  destinationMoves: Map<string, { originReturnedMoveId: string | null; quantity: number | null }[]>;
  referenceIds: string[];
};
