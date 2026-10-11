import { CLAIM_HELD_MESSAGE, claimKey, openJournal, withClaim } from 'src/shared/claims/claim';
import { readLocations } from 'src/stock/location/read-locations';
import { doneMoves } from 'src/stock/move/actions/done-moves';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { createInventoryMoves } from 'src/stock/quant/actions/create-inventory-moves';
import { planContainersToKeep, writeContainersToKeep } from 'src/stock/package/keep-containers';
import { markLastCount } from 'src/stock/quant/actions/mark-last-count';
import { type MoveQuantsOptions } from 'src/stock/quant/types/move-quants-options.type';
import { writeQuantCounts } from 'src/stock/quant/write-quant-counts';
import { StockUserError } from 'src/stock/stock-errors';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { planClearCounts } from 'src/stock/utils/plan-count-actions.util';
import { partialPackageRowIds, planMoveQuants, planRelocateMoves } from 'src/stock/utils/plan-relocate-moves.util';
import { type InventoryMovePlan } from 'src/stock/utils/types/inventory-move-plan.type';
import { type RelocateQuant } from 'src/stock/utils/types/relocate-quant.type';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

export const RELOCATE_INTERNAL_ONLY_MESSAGE = 'Pick an internal location to relocate to.';
export const MISSING_PRODUCT_MESSAGE = 'The product of a selected stock row is missing.';

// The rows with their product unit; null when a product is gone (no move can be made for it).
const toRelocateQuants = async (quants: QuantRow[]): Promise<RelocateQuant[] | null> => {
  const products = await readStockProducts([...new Set(quants.map((quant) => quant.productId))]);
  const rows = quants.flatMap((quant) => {
    const productUomId = products.get(quant.productId)?.uomId;

    return productUomId === undefined
      ? []
      : [
          {
            id: quant.id,
            productId: quant.productId,
            productUomId,
            locationId: quant.locationId,
            lotId: quant.lotId,
            packageId: quant.packageId,
            ownerId: quant.ownerId,
            quantity: quant.quantity,
          },
        ];
  });

  return rows.length === quants.length ? rows : null;
};

// The moves of a stored plan: made, validated at once, and the touched rows get today's count date. Packages that
// keep their containers are marked first, so the done moves put them back inside.
const postMoves = async (
  plans: InventoryMovePlan[],
  journal: ClaimJournal,
  stepPrefix: string,
  containers: { packageId: string; packageDestId: string }[] = [],
) => {
  if (containers.length > 0) {
    await journal.step(`${stepPrefix}:containers`, async () => true, () => writeContainersToKeep(containers));
  }
  await journal.step(`${stepPrefix}:moves`, async () => true, () => createInventoryMoves(plans));

  const result = await doneMoves(
    plans.map((plan) => plan.moveId),
    { cancelBackorder: true, journal, stepPrefix: `${stepPrefix}:done` },
  );

  await journal.step(`${stepPrefix}:last-count`, async () => true, () => markLastCount(plans));

  return result.doneMoveIds;
};

// Each quant leaves whole as one adjustment move, validated at once. The plan
// is stored first, so a resumed run moves the quantities read before the crash.
export const moveQuants = async (
  quants: QuantRow[],
  destinationId: string | null,
  reason: string | null,
  options: MoveQuantsOptions,
) => {
  const plan = await options.journal.step<{ moves: InventoryMovePlan[]; containers: { packageId: string; packageDestId: string }[] }>(
    `${options.stepPrefix}:plan`,
    async () => {
      const rows = await toRelocateQuants(quants);

      if (rows === null) {
        throw new Error(MISSING_PRODUCT_MESSAGE);
      }
      const unpack = options.unpack === true;

      return {
        moves: planMoveQuants({ quants: rows, destinationId, reason, newId: () => crypto.randomUUID(), unpack }),
        containers: unpack ? [] : await planContainersToKeep(rows, options.upToParentPackages ?? []),
      };
    },
    async () => {},
  );

  return postMoves(plan.moves, options.journal, options.stepPrefix, plan.containers);
};

// Per package: its own rows with stock or a reservation.
const readPackageContentIds = async (packageIds: string[]) => {
  const content = new Map<string, string[]>();

  for (const quant of await stockQuants.find<{ id: string; packageId: string }>(
    { packageId: { in: packageIds }, or: [{ quantity: { neq: 0 } }, { reservedQuantity: { neq: 0 } }] },
    'id packageId',
  )) {
    content.set(quant.packageId, [...(content.get(quant.packageId) ?? []), quant.id]);
  }
  return content;
};

type RelocateRequest = { quantIds: string[]; destinationId: string | null; reason: string | null };
type RelocatePlan =
  | { kind: 'refuse'; message: string }
  | { kind: 'nothing' }
  | { kind: 'moves'; quantIds: string[]; moves: InventoryMovePlan[]; containers: { packageId: string; packageDestId: string }[] };

// Read inside the claim, so the positive-quantity check sees the rows as they are when the run starts.
const planRelocate = async (request: RelocateRequest): Promise<RelocatePlan> => {
  const quants = await stockQuants.find<QuantRow>({ id: { in: request.quantIds } }, QUANT_ROW);
  const rows = await toRelocateQuants(quants);

  if (rows === null) {
    return { kind: 'refuse', message: MISSING_PRODUCT_MESSAGE };
  }
  const packageContentIds = await readPackageContentIds([...new Set(rows.flatMap((row) => row.packageId ?? []))]);
  const plan = planRelocateMoves({
    quants: rows,
    destinationId: request.destinationId,
    reason: request.reason,
    newId: () => crypto.randomUUID(),
    packageContentIds,
  });

  if (plan.kind !== 'moves') {
    return plan;
  }
  const leaving = partialPackageRowIds(rows, packageContentIds);

  return {
    kind: 'moves',
    quantIds: rows.map((row) => row.id),
    moves: plan.moves,
    containers: await planContainersToKeep(rows.filter((row) => !leaving.has(row.id)), []),
  };
};

// `request` null: a resume, which finishes only a run that passed its commit point; a run that stopped before it
// wrote nothing, and its claim is freed. A refusal is decided before the commit point and returned, so the claim is
// released at once.
const runRelocate = async (request: RelocateRequest | null, journal: ClaimJournal): Promise<RelocatePlan | null> => {
  if (request === null && !journal.committed) {
    return null;
  }
  const plan = await journal.step<RelocatePlan | null>(
    'relocate:plan',
    async () => (request === null ? null : planRelocate(request)),
    async () => {},
  );

  if (plan === null || plan.kind !== 'moves') {
    return plan;
  }
  await journal.commit();

  await journal.step('relocate:clear', async () => true, async () => {
    await writeQuantCounts(plan.quantIds, (quant) => planClearCounts([quant.id])[0].data);
  });
  await postMoves(plan.moves, journal, 'relocate:move', plan.containers ?? []);

  return plan;
};

// The claim is named after the first selected row in id order, so two people
// relocating the same selection meet on one claim.
const relocateKey = (quantIds: string[]) => claimKey('relocate', [...quantIds].sort()[0]);

export const relocateQuants = async (quantIds: string[], destinationId: string | null, reason: string | null) => {
  if (destinationId !== null) {
    const destination = (await readLocations([destinationId])).get(destinationId);

    if (destination?.usage !== LOCATION_USAGE.INTERNAL) {
      throw new StockUserError(RELOCATE_INTERNAL_ONLY_MESSAGE);
    }
  }
  const key = relocateKey(quantIds);
  const outcome = await withClaim(key, async (runId) =>
    runRelocate({ quantIds, destinationId, reason }, await openJournal(key, runId)),
  );

  if (outcome.kind === 'held') {
    throw new StockUserError(CLAIM_HELD_MESSAGE);
  }
  if (outcome.result?.kind === 'refuse') {
    throw new StockUserError(outcome.result.message);
  }

  return { kind: 'done', moved: outcome.result?.kind === 'moves' ? outcome.result.moves.length : 0 };
};

export const resumeRelocate = async (quantId: string) => {
  const key = claimKey('relocate', quantId);

  await withClaim(key, async (runId) => runRelocate(null, await openJournal(key, runId)));
};
