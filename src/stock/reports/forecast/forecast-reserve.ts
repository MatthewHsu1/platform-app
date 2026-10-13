import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { unreserveMoves } from 'src/stock/move/actions/unreserve-moves';
import { holdTransfers } from 'src/stock/reports/reception/allocation-holds';
import { FORECAST_MESSAGES } from 'src/stock/reports/forecast/forecast-messages.constant';
import { type ChainMove } from 'src/stock/reports/forecast/types/chain-move.type';
import { type ReserveAction } from 'src/stock/reports/forecast/types/reserve-action.type';
import { StockUserError } from 'src/stock/stock-errors';
import { findReadableAsPerson } from 'src/stock/stock-person-writes';
import { stockMoveMoveRels, stockMoves } from 'src/stock/stock-records';
import { linkedMovesFor } from 'src/stock/utils/linked-moves.util';

type ReservePort = {
  canRead: (moveId: string) => Promise<boolean>;
  readChain: (moveId: string) => Promise<ChainMove[]>;
  holdTransfers: <TResult>(recordIds: string[], run: () => Promise<TResult>) => Promise<TResult>;
  assignMoves: (moveIds: string[]) => Promise<void>;
  unreserveMoves: (moveIds: string[]) => Promise<void>;
};

const distinct = (ids: string[]) => [...new Set(ids)];

// A move outside any transfer is held by its own id.
const holdIdOf = (move: ChainMove) => move.pickingId ?? move.id;

// Reserve or Unreserve on a forecast line: the delivery and every move chained
// before it that can still change, across all their transfers. Each of those
// transfers is held while it runs, as an allocation holds them.
export const makeForecastReserve =
  (port: ReservePort) =>
  async ({ moveId, action }: { moveId: string; action: ReserveAction }) => {
    if (!(await port.canRead(moveId))) {
      throw new StockUserError(FORECAST_MESSAGES.moveNotFound);
    }
    const planned = await port.readChain(moveId);
    const plannedIds = new Set(linkedMovesFor({ moveId, moves: planned, action }));
    const holdIds = distinct(planned.filter((move) => plannedIds.has(move.id)).map(holdIdOf));

    if (holdIds.length === 0) {
      return { moveIds: [] };
    }
    return port.holdTransfers(holdIds, async () => {
      // The chain is read again under the holds; a move whose transfer is not
      // held is left for the next click.
      const held = new Set(holdIds);
      const chain = await port.readChain(moveId);
      const byId = new Map(chain.map((move) => [move.id, move]));
      const moveIds = linkedMovesFor({ moveId, moves: chain, action }).filter((id) => {
        const move = byId.get(id);

        return move !== undefined && held.has(holdIdOf(move));
      });

      if (moveIds.length > 0) {
        await (action === 'reserve' ? port.assignMoves(moveIds) : port.unreserveMoves(moveIds));
      }
      return { moveIds };
    });
  };

// The move and every move chained before it, as the app.
const readOriginChain = async (moveId: string): Promise<ChainMove[]> => {
  const moves = new Map<string, ChainMove>();
  let frontier = [moveId];

  while (frontier.length > 0) {
    const found = await readInChunks(frontier, (part) =>
      stockMoves.find<{ id: string; state: string; pickingId: string | null }>({ id: { in: part } }, 'id state pickingId'),
    );
    const links = await readInChunks(
      found.map((move) => move.id),
      (part) => stockMoveMoveRels.find<{ moveOrigId: string; moveDestId: string }>({ moveDestId: { in: part } }, 'moveOrigId moveDestId'),
    );

    for (const move of found) {
      moves.set(move.id, { ...move, moveOrigIds: links.filter((link) => link.moveDestId === move.id).map((link) => link.moveOrigId) });
    }
    frontier = distinct(links.map((link) => link.moveOrigId)).filter((id) => !moves.has(id));
  }

  return [...moves.values()];
};

export const forecastReserve = makeForecastReserve({
  canRead: async (moveId) =>
    (await findReadableAsPerson<{ id: string }>('stockMoves', 'StockMoveFilterInput', { id: { eq: moveId } }, 'id')).length > 0,
  readChain: readOriginChain,
  holdTransfers,
  assignMoves,
  unreserveMoves,
});
