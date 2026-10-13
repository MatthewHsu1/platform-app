import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';

type Row = { id: string; data: Record<string, unknown> };

// The create calls make only the rows whose ids are not there yet.
export type ProcurementWriteApi = {
  createMoves: (rows: Row[]) => Promise<void>;
  linkMoves: (rows: Row[]) => Promise<void>;
  linkRoutes: (rows: Row[]) => Promise<void>;
  linkReferences: (rows: Row[]) => Promise<void>;
  setPartner: (moveId: string, companyId: string) => Promise<void>;
  confirm: (moveIds: string[], journal?: ClaimJournal) => Promise<void>;
};
