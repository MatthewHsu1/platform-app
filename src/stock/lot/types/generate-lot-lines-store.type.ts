import { type MoveForLots } from 'src/stock/lot/types/move-for-lots.type';
import { type PutawayRequest } from 'src/stock/putaway/types/putaway-request.type';
import { type DateOrder } from 'src/stock/utils/types/date-order.type';

export type GenerateLotLinesStore = {
  readMove: (moveId: string) => Promise<MoveForLots | null>;
  readDateOrder: () => Promise<DateOrder>;
  readOpenLineIds: (moveId: string) => Promise<string[]>;
  putawayDestinations: (requests: PutawayRequest[]) => Promise<Map<string, string>>;
  lotIdsByName: (productId: string, names: string[]) => Promise<Map<string, string>>;
  deleteLines: (lineIds: string[]) => Promise<void>;
  // Creates the rows whose id is not there yet; returns the ids it created.
  createMissingLines: (rows: { id: string; data: Record<string, unknown> }[]) => Promise<string[]>;
  readExpirationDates: (lineIds: string[]) => Promise<Map<string, string | null>>;
  writeExpirationDate: (lineIds: string[], expirationDate: string) => Promise<void>;
  jumpSequence: (sequenceId: string, from: number, to: number) => Promise<void>;
  now: () => Date;
};
