import { graphqlClaimStore } from 'src/shared/claims/claim-store';
import { CLAIM_HELD_MESSAGE, heldClaimKeys, openJournal, withClaim } from 'src/shared/claims/claim';
import { runPlannedProcurements } from 'src/stock/procurement/apply-procurement-plan';
import { PROCUREMENT_WRITE_API } from 'src/stock/procurement/procurement-write-api';
import { planProcurementBatch, PROCUREMENT_STEP_PREFIX } from 'src/stock/procurement/run-procurements';
import { StockUserError } from 'src/stock/stock-errors';
import { type ClaimedProcurementsDeps } from 'src/stock/procurement/types/claimed-procurements-deps.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

// A procurement run under its own claim: the plan is stored on the claim and
// the claim commits right before the first write. A run that stopped after
// that point is finished from the stored plan, never planned again, so a
// chain of moves is written once and whole.
export const makeClaimedProcurements = ({ claims, findClaim, run }: ClaimedProcurementsDeps) => {
  // Throws ProcurementFailure, writing nothing, when the plan does not hold, and
  // a held-claim refusal when another run has the key. `beforeCommit` gets the
  // claim's run id right before the commit point, for a caller that must know
  // later whether these procurements were written. `onReplay` is told when the
  // claim was taken over from a stopped run that had committed: its stored
  // plan is finished instead of these procurements.
  const runClaimedProcurements = async (
    key: string,
    procurements: Procurement[],
    options: { beforeCommit?: (claimRunId: string) => Promise<void>; onReplay?: () => void } = {},
  ) => {
    // Once the caller starts marking these procurements as being written, the
    // claim must outlive a failed commit: still there and uncommitted, it is
    // what tells the caller later that nothing was written.
    let marking = false;
    const outcome = await claims.withClaim(
      key,
      async (runId) => {
        const { beforeCommit } = options;
        const journal = await claims.openJournal(key, runId);

        if (journal.committed) {
          options.onReplay?.();
        }

        return run(
          procurements,
          journal,
          beforeCommit === undefined
            ? undefined
            : () => {
                marking = true;
                return beforeCommit(runId);
              },
        );
      },
      { keepOnError: () => marking },
    );

    if (outcome.kind === 'held') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }

    return outcome.result;
  };

  // Takes a stopped run over and finishes its stored plan; a run that never
  // committed wrote nothing and is only freed. 'held' while another run has it.
  const resumeProcurementClaim = async (key: string) => {
    if ((await claims.heldClaimKeys([key])).length === 0) {
      return 'done' as const;
    }
    const outcome = await claims.withClaim(key, async (runId) => {
      const journal = await claims.openJournal(key, runId);

      if (journal.committed) {
        await run([], journal);
      }
    });

    return outcome.kind;
  };

  const isCommitted = async (key: string) => (await findClaim(key))?.progress?.committed === true;

  return { runClaimedProcurements, resumeProcurementClaim, isCommitted };
};

export const { runClaimedProcurements, resumeProcurementClaim, isCommitted: isProcurementClaimCommitted } =
  makeClaimedProcurements({
    claims: { withClaim, openJournal, heldClaimKeys },
    findClaim: graphqlClaimStore.findByKey,
    run: (procurements, journal, beforeCommit) =>
      runPlannedProcurements({
        plan: (id) => planProcurementBatch(procurements, id),
        runId: journal.runId,
        api: PROCUREMENT_WRITE_API,
        journal,
        stepPrefix: PROCUREMENT_STEP_PREFIX,
        onCommit: async () => {
          await beforeCommit?.();
          await journal.commit();
        },
      }),
  });
