import { claimKey, type makeClaims, openJournal, withClaim } from 'src/shared/claims/claim';
import { readLocations } from 'src/stock/location/read-locations';
import { readPackageContent } from 'src/stock/package/read-package-content';
import { recomputePackage } from 'src/stock/package/recompute-package';
import { moveQuants } from 'src/stock/quant/actions/relocate-quants';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { VIEW_LOCATION_REASON } from 'src/stock/utils/plan-count-quant-create.util';
import { PACKAGE_RELOCATED_REASON, planPackageRelocation } from 'src/stock/utils/plan-package-rules.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { type RelocatePackageOutcome } from 'src/stock/package/types/relocate-package-outcome.type';
import { type MoveQuantsOptions } from 'src/stock/quant/types/move-quants-options.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

type ContentQuant = { id: string; locationId: string; quantity: number; reservedQuantity: number };
type RelocateRequest = { toLocationId: string | null };
type RelocatePackagePlan =
  | { kind: 'nothing' }
  | { kind: 'refuse'; reason: string; values: TranslationValues }
  | { kind: 'move'; quantIds: string[]; upToParentPackageIds: string[]; toLocationId: string };
type RunOutcome = Exclude<RelocatePackageOutcome, { kind: 'held' }>;

type RelocatePackageStore = Pick<ReturnType<typeof makeClaims>, 'withClaim' | 'openJournal'> & {
  readContent: (packageId: string) => Promise<ContentQuant[]>;
  readLocation: (id: string) => Promise<{ usage: LocationUsage; completeName: string | null } | null>;
  readQuants: (ids: string[]) => Promise<QuantRow[]>;
  moveQuants: (quants: QuantRow[], destinationId: string | null, reason: string | null, options: MoveQuantsOptions) => Promise<unknown>;
  recomputePackage: (packageIds: string[]) => Promise<void>;
};

const PLAN_STEP = 'relocatePackage:plan';
const DONE: RunOutcome = { kind: 'done' };

export const makeRelocatePackage = (store: RelocatePackageStore) => {
  const planRelocation = async (packageId: string, request: RelocateRequest): Promise<RelocatePackagePlan> => {
    const plan = planPackageRelocation({
      packageId,
      newLocationId: request.toLocationId,
      containedQuants: await store.readContent(packageId),
    });

    if (plan.kind !== 'move' || request.toLocationId === null) {
      return plan.kind === 'refuse' ? { ...plan, values: {} } : { kind: 'nothing' };
    }
    // A virtual location holds no stock: the moves would fail after the run passed its commit point.
    const destination = await store.readLocation(request.toLocationId);

    if (destination?.usage === LOCATION_USAGE.VIEW) {
      return { kind: 'refuse', reason: VIEW_LOCATION_REASON, values: { location: destination.completeName ?? '' } };
    }
    return { ...plan, toLocationId: request.toLocationId };
  };

  // A run that stopped before its commit point wrote nothing; its claim is freed. The package already shows the
  // edit, so a planned move that never happened leaves it showing where its stock still is.
  const freeUncommitted = async (packageId: string, journal: ClaimJournal) => {
    const stored = await journal.step<RelocatePackagePlan>(PLAN_STEP, async () => ({ kind: 'nothing' }), async () => {});

    if (stored.kind === 'move') {
      await store.recomputePackage([packageId]);
    }
    return DONE;
  };

  // `request` null: a resume, which finishes only a run that passed its commit point. A refusal is decided before
  // the commit point, so the claim is released at once.
  const runRelocatePackage = async (packageId: string, request: RelocateRequest | null, journal: ClaimJournal): Promise<RunOutcome> => {
    if (request === null && !journal.committed) {
      return freeUncommitted(packageId, journal);
    }
    const plan = await journal.step<RelocatePackagePlan>(
      PLAN_STEP,
      async () => (request === null ? { kind: 'nothing' } : planRelocation(packageId, request)),
      async () => {},
    );

    if (plan.kind === 'refuse') {
      return { kind: 'refused', reason: plan.reason, values: plan.values };
    }
    if (plan.kind === 'nothing') {
      return DONE;
    }
    await journal.commit();
    // A resumed run replays the moves its stored plan chose; the rows read here only matter to a first run.
    await store.moveQuants(await store.readQuants(plan.quantIds), plan.toLocationId, PACKAGE_RELOCATED_REASON, {
      upToParentPackages: plan.upToParentPackageIds,
      journal,
      stepPrefix: 'relocatePackage:move',
    });
    await store.recomputePackage([packageId]);

    return DONE;
  };

  const runOnce = (packageId: string, request: RelocateRequest | null) => {
    const key = claimKey('relocatePackage', packageId);

    return store.withClaim(key, async (runId) => {
      const journal = await store.openJournal(key, runId);

      // The claim was a stopped run's: that run is finished (or freed) first, and this request runs next.
      if (journal.resumed) {
        await runRelocatePackage(packageId, null, journal);
        return { replayed: true, outcome: DONE };
      }
      return { replayed: false, outcome: request === null ? DONE : await runRelocatePackage(packageId, request, journal) };
    });
  };

  const relocatePackage = async (packageId: string, toLocationId: string | null): Promise<RelocatePackageOutcome> => {
    for (;;) {
      const claimed = await runOnce(packageId, { toLocationId });

      if (claimed.kind === 'held') {
        return { kind: 'held' };
      }
      if (!claimed.result.replayed) {
        return claimed.result.outcome;
      }
    }
  };

  const resumeRelocatePackage = async (packageId: string) => {
    await runOnce(packageId, null);
  };

  return { relocatePackage, resumeRelocatePackage };
};

export const { relocatePackage, resumeRelocatePackage } = makeRelocatePackage({
  withClaim,
  openJournal,
  readContent: readPackageContent,
  readLocation: async (id) => (await readLocations([id])).get(id) ?? null,
  readQuants: (ids) => stockQuants.find<QuantRow>({ id: { in: ids } }, QUANT_ROW),
  moveQuants,
  recomputePackage,
});
