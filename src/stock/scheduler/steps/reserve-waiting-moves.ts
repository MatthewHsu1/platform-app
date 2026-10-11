import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { MOVE_STATE, RESERVATION_METHOD } from 'src/stock/stock-options.constant';
import { stockMoves, stockPickingTypes } from 'src/stock/stock-records';
import { todayUtc } from 'src/stock/stock-settings';
import { planWaitingMovesToReserve } from 'src/stock/utils/plan-waiting-moves-to-reserve.util';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type ReservationMethod } from 'src/stock/types/reservation-method.type';

// The scheduler reserves 1000 moves per pass; a failed pass does not stop the next.
const CHUNK_SIZE = 1000;

export const reserveWaitingMoves = async () => {
  const today = todayUtc();
  const types = await stockPickingTypes.find<{ id: string; reservationMethod: ReservationMethod }>(
    {},
    'id reservationMethod',
  );
  const methodByType = new Map(types.map((type) => [type.id, type.reservationMethod]));
  const atConfirmTypeIds = types
    .filter((type) => type.reservationMethod === RESERVATION_METHOD.AT_CONFIRM)
    .map((type) => type.id);
  const due = [
    { reservationDate: { lte: today } },
    ...(atConfirmTypeIds.length > 0 ? [{ pickingTypeId: { in: atConfirmTypeIds } }] : []),
  ];
  const moves = await stockMoves.find<
    Pick<MoveRow, 'id' | 'state' | 'productUomQty' | 'reservationDate' | 'priority' | 'date' | 'pickingTypeId'>
  >(
    {
      and: [
        { state: { in: [MOVE_STATE.CONFIRMED, MOVE_STATE.PARTIALLY_AVAILABLE] } },
        { productUomQty: { neq: 0 } },
        { or: due },
      ],
    },
    'id state productUomQty reservationDate priority date pickingTypeId',
  );
  const chunks = planWaitingMovesToReserve({
    today,
    chunkSize: CHUNK_SIZE,
    moves: moves.map((move) => ({
      ...move,
      pickingTypeReservationMethod: move.pickingTypeId === null ? null : (methodByType.get(move.pickingTypeId) ?? null),
    })),
  });
  const errors = errorCollector();

  for (const moveIds of chunks) {
    await errors.run(`reserve ${moveIds.length} moves`, () => assignMoves(moveIds));
  }
  errors.throwIfAny();
};
