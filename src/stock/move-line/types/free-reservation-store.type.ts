import { type FreeReservationCandidate } from 'src/stock/utils/types/free-reservation-candidate.type';

export type FreeReservationStore = {
  bypassesReservation: (key: string) => Promise<boolean>;
  readCandidates: (key: string, ignoreLineIds: string[]) => Promise<FreeReservationCandidate[]>;
  destroyLines: (lineIds: string[]) => Promise<void>;
  shrinkLine: (lineId: string, quantityProductUom: number) => Promise<void>;
  makeMovesToStock: (moveIds: string[]) => Promise<void>;
  recomputeReserved: (keys: string[]) => Promise<void>;
  recomputeMove: (moveIds: string[]) => Promise<void>;
  assignMoves: (moveIds: string[]) => Promise<void>;
  digits: () => number;
};
