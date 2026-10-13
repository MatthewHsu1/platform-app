import { type ReturnData } from 'src/stock/picking/types/return-data.type';
import { type ReturnPort } from 'src/stock/picking/types/return-port.type';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ClaimKey } from 'src/shared/claims/types/claim-key.type';
import { type ProcurementRequest } from 'src/stock/procurement/types/procurement-request.type';

type Row = Record<string, unknown> & { id: string };
type StoredStep = { plan: unknown; done: boolean };
type StoredClaim = { runId: string; steps: Map<string, StoredStep>; committed: boolean };

// Stores rows and keeps the claim journal in memory. `crashAtWrite` stops the server inside the n-th write, before
// it lands; `crashAtCheck` stops it in the procurement check, before the commit point. A crash leaves the claim held.
export const makeFakeReturnPort = (
  data: ReturnData,
  { crashAtWrite, crashAtCheck = false }: { crashAtWrite: number | null; crashAtCheck?: boolean },
) => {
  const state = {
    pickings: [] as Row[],
    moves: [] as Row[],
    moveLinks: [] as Row[],
    referenceLinks: [] as Row[],
    notes: [] as { pickingId: string; text: string }[],
    confirmed: [] as string[],
    unreserved: [] as string[],
    procurements: [] as ProcurementRequest[][],
    checked: [] as ProcurementRequest[][],
    namesDrawn: 0,
    claims: new Map<ClaimKey, StoredClaim>(),
  };
  let writes = 0;
  let ids = 0;
  let runs = 0;
  let checks = 0;

  const write = () => {
    writes += 1;
    if (crashAtWrite !== null && writes === crashAtWrite) {
      throw new Error(`server stopped at write ${writes}`);
    }
  };
  const createMissing = (table: Row[], rows: Row[]) => {
    write();
    for (const row of rows) {
      if (!table.some((existing) => existing.id === row.id)) {
        table.push(row);
      }
    }
  };

  const port: ReturnPort = {
    digits: () => 2,
    now: () => '2026-10-08T10:00:00.000Z',
    newId: () => {
      ids += 1;
      return `id${ids}`;
    },
    readReturnData: async () => data,
    nextPickingName: async () => {
      state.namesDrawn += 1;
      return `WH/IN/0000${state.namesDrawn}`;
    },
    withClaim: async (key, run) => {
      runs += 1;
      const existing = state.claims.get(key);
      const runId = `run${runs}`;

      state.claims.set(key, { runId, steps: existing?.steps ?? new Map(), committed: existing?.committed ?? false });
      const result = await run(runId);
      state.claims.delete(key);
      return { kind: 'done', result };
    },
    openJournal: async (key, runId): Promise<ClaimJournal> => {
      const claim = state.claims.get(key);
      if (claim === undefined || claim.runId !== runId) {
        throw new Error('claim lost');
      }
      return {
        runId,
        resumed: claim.steps.size > 0,
        committed: claim.committed,
        step: async (name, plan, work) => {
          const stored = claim.steps.get(name);
          if (stored?.done === true) {
            return stored.plan as never;
          }
          const value = stored === undefined ? await plan() : (stored.plan as never);
          claim.steps.set(name, { plan: value, done: false });
          await work(value);
          claim.steps.set(name, { plan: value, done: true });
          return value;
        },
        commit: async () => {
          claim.committed = true;
        },
      };
    },
    checkProcurements: async (requests) => {
      checks += 1;
      if (crashAtCheck && checks === 1) {
        throw new Error('server stopped before the commit point');
      }
      state.checked.push(requests);
    },
    unreserveMoves: async (moveIds) => {
      write();
      state.unreserved.push(...moveIds);
    },
    createPickings: async (rows) => createMissing(state.pickings, rows),
    createMoves: async (rows) => createMissing(state.moves, rows),
    createMoveLinks: async (rows) => createMissing(state.moveLinks, rows),
    createReferenceLinks: async (rows) => createMissing(state.referenceLinks, rows),
    recompute: async () => {
      write();
    },
    addPickingNote: async (pickingId, text) => {
      write();
      state.notes.push({ pickingId, text });
    },
    confirmAndAssign: async (pickingId) => {
      write();
      state.confirmed.push(pickingId);
    },
    runProcurements: async (requests) => {
      write();
      state.procurements.push(requests);
    },
  };

  return { port, state, writeCount: () => writes };
};
