import { addNote } from 'src/shared/triggers/put-back';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { translate } from 'src/shared/i18n/translate';
import { nextNumber } from 'src/base/sequence/next-number';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { checkEntirePack } from 'src/stock/package/check-entire-pack';
import { assignPickings } from 'src/stock/picking/actions/assign-pickings';
import { hasPickingNote } from 'src/stock/picking/has-picking-note';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { MOVE_STATE, RESERVATION_METHOD } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings, stockPickingTypes } from 'src/stock/stock-records';
import { PICKING_ROW } from 'src/stock/stock-rows';
import { planBackorderPicking } from 'src/stock/utils/plan-backorder-picking.util';
import { leaveBatchBeforeBackorder } from 'src/stock-picking-batch/leave-batch-before-backorder';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type CreateBackorderStore } from 'src/stock/picking/types/create-backorder-store.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type ReservationMethod } from 'src/stock/types/reservation-method.type';
import { type BatchContext } from 'src/stock/picking/types/batch-context.type';

type BackorderPlan = { backorderId: string; moveIds: string[] };

// The backorder is made once: its id is chosen in the plan, and a rerun finds it by that id. A
// number taken before a stop is a gap, as sequences allow. A rerun adds the note only when the
// transfer does not have it yet.
export const makeCreateBackorder =
  (store: CreateBackorderStore) =>
  async (
    pickingId: string,
    moveIds: string[] | null,
    journal: ClaimJournal,
    stepName: string,
    batchContext: BatchContext = { validatingIds: [pickingId], pickingsToDetach: [] },
  ): Promise<string | null> => {
    const plan = await journal.step<BackorderPlan>(
      stepName,
      async () => ({
        backorderId: store.newId(),
        moveIds: moveIds ?? (await store.readBackorderSource(pickingId))?.liveMoveIds ?? [],
      }),
      async (stored) => {
        if (stored.moveIds.length === 0) {
          return;
        }
        await store.leaveBatchBeforeBackorder([pickingId], batchContext);
        await store.recomputeMove(stored.moveIds);
        const source = await store.readBackorderSource(pickingId);

        if (source === null) {
          return;
        }
        if ((await store.readPickingName(stored.backorderId)) === null) {
          const name = source.referenceSequenceId === null ? '/' : await store.nextNumber(source.referenceSequenceId);
          await store.createPicking(stored.backorderId, planBackorderPicking({ original: source.picking, note: source.note, name }));
        }
        await store.moveMovesToPicking(stored.moveIds, stored.backorderId);
      },
    );

    if (plan.moveIds.length === 0) {
      return null;
    }
    await journal.step(
      `${stepName}:note`,
      async () => true,
      async () => {
        const name = (await store.readPickingName(plan.backorderId)) ?? '/';
        const text = translate(null, 'The backorder {name} has been created.', { name });

        if (!(await store.hasPickingNote(pickingId, text))) {
          await store.addPickingNote(pickingId, text);
        }
      },
    );
    await journal.step(
      `${stepName}:assign`,
      async () => true,
      async () => {
        const source = await store.readBackorderSource(pickingId);

        await store.recomputePickingState([pickingId, plan.backorderId]);
        if (source?.reservationMethod === RESERVATION_METHOD.AT_CONFIRM) {
          await store.assignPickings([plan.backorderId]);
        }
        await store.checkEntirePack([plan.backorderId]);
      },
    );

    return plan.backorderId;
  };

// `note` is a rich text field; its value is copied as read.
const NOTE_SELECTION = 'note { blocknote markdown }';

const graphqlCreateBackorderStore: CreateBackorderStore = {
  readBackorderSource: async (pickingId) => {
    const [picking] = await stockPickings.find<PickingRow & { note: unknown }>(
      { id: { eq: pickingId } },
      `${PICKING_ROW} ${NOTE_SELECTION}`,
    );

    if (picking === undefined) {
      return null;
    }
    const [type] =
      picking.pickingTypeId === null
        ? []
        : await stockPickingTypes.find<{ reservationMethod: ReservationMethod; referenceSequenceId: string | null }>(
            { id: { eq: picking.pickingTypeId } },
            'reservationMethod referenceSequenceId',
          );
    const moves = await stockMoves.find<{ id: string; state: string }>({ pickingId: { eq: pickingId } }, 'id state');
    const { note, ...row } = picking;

    return {
      picking: row,
      note,
      reservationMethod: type?.reservationMethod ?? null,
      referenceSequenceId: type?.referenceSequenceId ?? null,
      liveMoveIds: moves.filter((move) => move.state !== MOVE_STATE.DONE && move.state !== MOVE_STATE.CANCEL).map((move) => move.id),
    };
  },
  readPickingName: async (pickingId) =>
    (await stockPickings.findIncludingDeleted<{ name: string | null }>({ id: { eq: pickingId } }, 'name'))[0]?.name ?? null,
  newId: () => crypto.randomUUID(),
  recomputeMove,
  nextNumber,
  createPicking: async (pickingId, data) => {
    await createMissingRows(stockPickings, [{ id: pickingId, data }]);
  },
  moveMovesToPicking: async (moveIds, pickingId) => {
    await stockMoves.updateMany(moveIds, { pickingId, picked: false });
    const lines = await stockMoveLines.find<{ id: string }>({ moveId: { in: moveIds } }, 'id');
    await stockMoveLines.updateMany(
      lines.map((line) => line.id),
      { pickingId, picked: false },
    );
  },
  hasPickingNote,
  addPickingNote: (pickingId, text) => addNote({ objectSingular: 'stockPicking', recordId: pickingId, title: text, body: text }),
  recomputePickingState,
  assignPickings,
  checkEntirePack,
  leaveBatchBeforeBackorder,
};

export const createBackorder = makeCreateBackorder(graphqlCreateBackorderStore);
