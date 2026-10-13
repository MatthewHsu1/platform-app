import { claimKey, type makeClaims, openJournal, withClaim } from 'src/shared/claims/claim';
import { stockPackages } from 'src/stock/package/package-records';
import { recomputePackage } from 'src/stock/package/recompute-package';
import { moveQuants } from 'src/stock/quant/actions/relocate-quants';
import { deleteZeroQuants } from 'src/stock/quant/delete-zero-quants';
import { stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { planUnpack } from 'src/stock/utils/plan-package-rules.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type UnpackOutcome } from 'src/stock/package/types/unpack-outcome.type';
import { type MoveQuantsOptions } from 'src/stock/quant/types/move-quants-options.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

type ContentQuant = { id: string; quantity: number; reservedQuantity: number; quantKey: string | null };
type UnpackPlan =
  | { kind: 'refuse'; reason: string }
  | { kind: 'unpack'; childIds: string[]; quantIds: string[]; quantKeys: string[]; reason: string };
type RunOutcome = Exclude<UnpackOutcome, { kind: 'held' }>;

type UnpackStore = Pick<ReturnType<typeof makeClaims>, 'withClaim' | 'openJournal'> & {
  readChildIds: (packageId: string) => Promise<string[]>;
  // The package's own rows, not those of the packages inside it.
  readContent: (packageId: string) => Promise<ContentQuant[]>;
  releaseChildren: (childIds: string[]) => Promise<void>;
  readQuants: (ids: string[]) => Promise<QuantRow[]>;
  moveQuants: (quants: QuantRow[], destinationId: string | null, reason: string | null, options: MoveQuantsOptions) => Promise<unknown>;
  deleteZeroQuants: (keys: string[]) => Promise<void>;
  recomputePackage: (packageIds: string[]) => Promise<void>;
};

const PLAN_STEP = 'unpack:plan';
const DONE: RunOutcome = { kind: 'done' };

export const makeUnpackPackage = (store: UnpackStore) => {
  const planFor = async (packageId: string, reason: string): Promise<UnpackPlan> => {
    const [childIds, content] = await Promise.all([store.readChildIds(packageId), store.readContent(packageId)]);
    const plan = planUnpack({ childIds, quants: content });

    return plan.kind === 'refuse'
      ? plan
      : { ...plan, quantKeys: content.flatMap((quant) => quant.quantKey ?? []), reason };
  };

  // `reason` null: a resume, which finishes only a run that passed its commit point; a run that stopped before it
  // wrote nothing, and its claim is freed. A refusal is decided before the commit point.
  const runUnpack = async (packageId: string, reason: string | null, journal: ClaimJournal): Promise<RunOutcome> => {
    if (reason === null && !journal.committed) {
      return DONE;
    }
    const plan = await journal.step<UnpackPlan | null>(
      PLAN_STEP,
      async () => (reason === null ? null : planFor(packageId, reason)),
      async () => {},
    );

    if (plan === null) {
      return DONE;
    }
    if (plan.kind === 'refuse') {
      return { kind: 'refused', reason: plan.reason };
    }
    await journal.commit();
    await journal.step('unpack:children', async () => true, () => store.releaseChildren(plan.childIds));
    if (plan.quantIds.length > 0) {
      // A resumed run replays the moves its stored plan chose; the rows read here only matter to a first run.
      await store.moveQuants(await store.readQuants(plan.quantIds), null, plan.reason, {
        unpack: true,
        journal,
        stepPrefix: 'unpack:move',
      });
    }
    // Rows the unpacking emptied go at once, so the package keeps no empty rows.
    await store.deleteZeroQuants(plan.quantKeys);
    await store.recomputePackage([packageId, ...plan.childIds]);

    return DONE;
  };

  const runOnce = (packageId: string, reason: string | null) => {
    const key = claimKey('unpack', packageId);

    return store.withClaim(key, async (runId) => {
      const journal = await store.openJournal(key, runId);

      // The claim was a stopped run's: that run is finished (or freed) first, and this request runs next.
      if (journal.resumed) {
        await runUnpack(packageId, null, journal);
        return { replayed: true, outcome: DONE };
      }
      return { replayed: false, outcome: reason === null ? DONE : await runUnpack(packageId, reason, journal) };
    });
  };

  const unpackPackage = async (packageId: string, reason: string): Promise<UnpackOutcome> => {
    for (;;) {
      const claimed = await runOnce(packageId, reason);

      if (claimed.kind === 'held') {
        return { kind: 'held' };
      }
      if (!claimed.result.replayed) {
        return claimed.result.outcome;
      }
    }
  };

  const resumeUnpack = async (packageId: string) => {
    await runOnce(packageId, null);
  };

  // Every package is planned before any is unpacked, so a refused one leaves the others as they were. Each run
  // plans again under its claim.
  const unpackPackages = async (packageIds: string[], reason: string): Promise<UnpackOutcome> => {
    const distinctIds = [...new Set(packageIds)];

    for (const packageId of distinctIds) {
      const plan = await planFor(packageId, reason);

      if (plan.kind === 'refuse') {
        return { kind: 'refused', reason: plan.reason };
      }
    }
    for (const packageId of distinctIds) {
      const outcome = await unpackPackage(packageId, reason);

      if (outcome.kind !== 'done') {
        return outcome;
      }
    }
    return DONE;
  };

  return { unpackPackage, unpackPackages, resumeUnpack };
};

export const { unpackPackage, unpackPackages, resumeUnpack } = makeUnpackPackage({
  withClaim,
  openJournal,
  readChildIds: async (packageId) =>
    (await stockPackages.find<{ id: string }>({ parentPackageId: { eq: packageId } }, 'id')).map((row) => row.id),
  readContent: (packageId) =>
    stockQuants.find<ContentQuant>({ packageId: { eq: packageId } }, 'id quantity reservedQuantity quantKey'),
  releaseChildren: (childIds) => stockPackages.updateMany(childIds, { parentPackageId: null }),
  readQuants: (ids) => stockQuants.find<QuantRow>({ id: { in: ids } }, QUANT_ROW),
  moveQuants,
  deleteZeroQuants,
  recomputePackage,
});
