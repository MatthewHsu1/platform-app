import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { confirmMoves } from 'src/stock/move/actions/confirm-moves';
import { stockMoveMoveRels, stockMoves, stockReferenceMoveRels, stockRouteMoves } from 'src/stock/routing-records';
import { type ProcurementWriteApi } from 'src/stock/procurement/types/procurement-write-api.type';

// The writes a procurement run makes, as the app. The run's moves come with
// their unit, locations, type and warehouse set, and are confirmed here.
export const PROCUREMENT_WRITE_API: ProcurementWriteApi = {
  createMoves: async (rows) => {
    await createMissingRows(stockMoves, rows);
  },
  linkMoves: async (rows) => {
    await createMissingRows(stockMoveMoveRels, rows);
  },
  linkRoutes: async (rows) => {
    await createMissingRows(stockRouteMoves, rows);
  },
  linkReferences: async (rows) => {
    await createMissingRows(stockReferenceMoveRels, rows);
  },
  setPartner: (moveId, companyId) => stockMoves.update(moveId, { companyId, personId: null }),
  confirm: async (moveIds, journal) => {
    await confirmMoves(moveIds, { merge: true, createProcurement: true, journal });
  },
};

// Plans a run and writes nothing; a plan with errors still throws ProcurementFailure.
// Use it without a journal: under one, its write steps would be stored as done.
export const DRY_RUN_PROCUREMENT_WRITE_API: ProcurementWriteApi = {
  createMoves: async () => {},
  linkMoves: async () => {},
  linkRoutes: async () => {},
  linkReferences: async () => {},
  setPartner: async () => {},
  confirm: async () => {},
};
