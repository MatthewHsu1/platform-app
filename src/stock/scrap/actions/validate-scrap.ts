import { nextNumberByCode } from 'src/base/sequence/next-number';
import { CLAIM_HELD_MESSAGE, claimKey, openJournal, withClaim } from 'src/shared/claims/claim';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { updateWhere } from 'src/shared/compare-and-set';
import { includingDeleted } from 'src/shared/triggers/records';
import { readLocations } from 'src/stock/location/read-locations';
import { doneMoves } from 'src/stock/move/actions/done-moves';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { checkProcurements, runProcurements } from 'src/stock/procurement/plan-procurements-hook';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { quantKey } from 'src/stock/quant/quant-key';
import { DONE_SCRAP_DELETE_REASON } from 'src/stock/scrap/rules/scrap-deletes';
import { type ScrapValidateAnswer } from 'src/stock/scrap/types/scrap-validate-answer.type';
import { StockUserError } from 'src/stock/stock-errors';
import { LOCATION_USAGE, SCRAP_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings, stockQuants, stockScraps } from 'src/stock/stock-records';
import { PICKING_ROW, QUANT_ROW, SCRAP_ROW } from 'src/stock/stock-rows';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { planScrapCheck, planScrapMove, planScrapName, SCRAP_NOT_DRAFT_MESSAGE } from 'src/stock/utils/plan-scrap.util';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ProcurementRequest } from 'src/stock/procurement/types/procurement-request.type';
import { type StockProduct } from 'src/stock/product/types/stock-product.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';
import { type ScrapRow } from 'src/stock/types/scrap-row.type';

const SCRAP_SEQUENCE_CODE = 'stock.scrap';
export const SCRAP_MISSING_MESSAGE = 'This scrap no longer exists.';
export const SCRAP_INCOMPLETE_MESSAGE = 'Fill in the product, unit, source location and scrap location first.';

type ReadyScrap = Omit<ScrapRow, 'productId' | 'productUomId' | 'locationId' | 'scrapLocationId'> & {
  productId: string;
  productUomId: string;
  locationId: string;
  scrapLocationId: string;
};

type ScrapPlan = {
  scrapId: string;
  scrapName: string;
  moveId: string;
  lineId: string;
  move: Record<string, unknown>;
  line: Record<string, unknown>;
  replenish: ProcurementRequest | null;
};

const readReadyScrap = async (scrapId: string): Promise<{ scrap: ReadyScrap; product: StockProduct }> => {
  const [scrap] = await stockScraps.find<ScrapRow>({ id: { eq: scrapId } }, SCRAP_ROW);

  if (scrap === undefined) {
    throw new StockUserError(SCRAP_MISSING_MESSAGE);
  }
  const { productId, productUomId, locationId, scrapLocationId } = scrap;

  if (productId === null || productUomId === null || locationId === null || scrapLocationId === null) {
    throw new StockUserError(SCRAP_INCOMPLETE_MESSAGE);
  }
  const product = (await readStockProducts([productId])).get(productId);

  if (product === undefined) {
    throw new StockUserError(SCRAP_INCOMPLETE_MESSAGE);
  }

  return { scrap: { ...scrap, productId, productUomId, locationId, scrapLocationId }, product };
};

// The availability check rounds the converted quantity up; a move line keeps its product-unit quantity rounded
// half-up, as every other line does.
const inProductUnit = async (scrap: ReadyScrap, product: StockProduct, method: 'UP' | 'HALF-UP') =>
  convertQuantity({
    qty: scrap.scrapQty,
    fromUomId: scrap.productUomId,
    toUomId: product.uomId,
    uoms: await readResolvedUoms(),
    digits: readStockSettings().productUnitDigits,
    method,
  });

const readInsufficientAnswer = async (
  scrap: ReadyScrap,
  product: StockProduct,
  quantity: number,
): Promise<ScrapValidateAnswer> => {
  const quants = await stockQuants.find<QuantRow>({ productId: { eq: scrap.productId } }, QUANT_ROW);
  const locations = await readLocations([scrap.locationId, ...quants.map((quant) => quant.locationId)]);
  const locationName = (locationId: string) => {
    const location = locations.get(locationId);

    return location?.completeName ?? location?.name ?? '';
  };

  return {
    kind: 'needsAnswer',
    question: 'insufficientQuantity',
    scrapId: scrap.id,
    productName: product.displayName,
    locationName: locationName(scrap.locationId),
    quantity,
    unitName: (await readResolvedUoms()).get(product.uomId)?.name ?? '',
    quants: quants
      .filter((quant) => locations.get(quant.locationId)?.usage === LOCATION_USAGE.INTERNAL)
      .map((quant) => ({ locationName: locationName(quant.locationId), quantity: quant.quantity }))
      .sort((left, right) => left.locationName.localeCompare(right.locationName)),
  };
};

// Read again under the claim: a scrap another click finished meanwhile is refused before anything is written. The
// scrap number is drawn inside the stored plan, so a resumed run keeps it.
const buildScrapPlan = async (scrapId: string): Promise<ScrapPlan> => {
  const { scrap, product } = await readReadyScrap(scrapId);

  if (scrap.state !== SCRAP_STATE.DRAFT) {
    throw new StockUserError(SCRAP_NOT_DRAFT_MESSAGE);
  }
  const picking =
    scrap.pickingId === null
      ? undefined
      : (await stockPickings.find<PickingRow>({ id: { eq: scrap.pickingId } }, PICKING_ROW))[0];
  const scrapName = planScrapName(await nextNumberByCode(SCRAP_SEQUENCE_CODE));
  const moveId = crypto.randomUUID();
  const lineId = crypto.randomUUID();
  const { move, line } = planScrapMove({
    scrap: {
      scrapId,
      origin: scrap.origin,
      productId: scrap.productId,
      productUomId: scrap.productUomId,
      scrapQty: scrap.scrapQty,
      scrapQtyProductUom: await inProductUnit(scrap, product, 'HALF-UP'),
      locationId: scrap.locationId,
      scrapLocationId: scrap.scrapLocationId,
      lotId: scrap.lotId,
      packageId: scrap.packageId,
      ownerId: scrap.ownerId,
      pickingId: scrap.pickingId,
    },
    scrapName,
    pickingName: picking?.name ?? null,
    moveId,
    lineId,
    now: nowIso(),
  });

  return {
    scrapId,
    scrapName,
    moveId,
    lineId,
    move,
    line,
    replenish: scrap.shouldReplenish
      ? {
          productId: scrap.productId,
          productQty: scrap.scrapQty,
          productUomId: scrap.productUomId,
          locationId: scrap.locationId,
          name: scrapName,
          origin: scrapName,
          values: {},
        }
      : null,
  };
};

// A draft scrap may be put in the trash while its Validate runs; a by-id update does not reach a soft-deleted row, so
// the filter names deletedAt and the run still finishes what it posted.
const updateScrap = (scrapId: string, data: Record<string, unknown>) =>
  updateWhere({
    objectSingular: 'stockScrap',
    objectPlural: 'stockScraps',
    filter: includingDeleted({ id: { eq: scrapId } }),
    data,
  });

const createScrapMove = async (plan: ScrapPlan) => {
  await updateScrap(plan.scrapId, { name: plan.scrapName });
  await createMissingRows(stockMoves, [{ id: plan.moveId, data: plan.move }]);
  await createMissingRows(stockMoveLines, [{ id: plan.lineId, data: plan.line }]);
  await recomputeMove([plan.moveId]);
};

// `resume`: the daily job finishes only a run that passed its commit point; one that stopped before it wrote nothing
// but a scrap number, and its claim is freed. The scrap move is validated alone: no backorder, and no retry of
// waiting moves (that belongs to a transfer's Validate).
const runScrap = async (scrapId: string, resume: boolean, journal: ClaimJournal) => {
  if (resume && !journal.committed) {
    return;
  }
  const plan = await journal.step<ScrapPlan | null>(
    'scrap:plan',
    async () => (resume ? null : buildScrapPlan(scrapId)),
    async () => {},
  );

  if (plan === null) {
    return;
  }
  // A replenishment that cannot be planned refuses the scrap before anything is written. The real run plans again
  // once the scrap is done, so this check counts the scrapped units as already gone from their location.
  if (!journal.committed && plan.replenish !== null) {
    const scrapped = plan.line.quantityProductUom;

    await checkProcurements([plan.replenish], {
      stockTaken: [
        {
          productId: plan.replenish.productId,
          locationId: plan.replenish.locationId,
          quantity: typeof scrapped === 'number' ? scrapped : 0,
        },
      ],
    });
  }
  await journal.commit();

  await journal.step('scrap:move', async () => true, () => createScrapMove(plan));
  await doneMoves([plan.moveId], { cancelBackorder: true, journal, stepPrefix: 'scrap:done', retryWaiting: false });
  await journal.step('scrap:finish', async () => nowIso(), async (dateDone) => {
    await updateScrap(plan.scrapId, { state: SCRAP_STATE.DONE, dateDone });
  });
  if (plan.replenish !== null) {
    const replenish = plan.replenish;

    await journal.step('scrap:replenish', async () => true, () => runProcurements([replenish], { journal }));
  }
};

export const validateScrap = async (
  scrapId: string,
  options: { confirmInsufficient: boolean },
): Promise<ScrapValidateAnswer> => {
  const { scrap, product } = await readReadyScrap(scrapId);
  const checkQuantity = await inProductUnit(scrap, product, 'UP');
  const [quant] = await stockQuants.find<QuantRow>(
    {
      quantKey: {
        eq: quantKey({
          productId: scrap.productId,
          locationId: scrap.locationId,
          lotId: scrap.lotId,
          packageId: scrap.packageId,
          ownerId: scrap.ownerId,
        }),
      },
    },
    QUANT_ROW,
  );
  const check = planScrapCheck({
    state: scrap.state,
    scrapQty: scrap.scrapQty,
    scrapQtyProductUom: checkQuantity,
    isStorable: product.isStorable,
    onHandAtKey: quant?.quantity ?? 0,
    digits: readStockSettings().productUnitDigits,
  });

  if (check.kind === 'refuse') {
    throw new StockUserError(check.message);
  }
  if (check.kind === 'insufficient' && !options.confirmInsufficient) {
    return readInsufficientAnswer(scrap, product, check.quantityProductUom);
  }

  const key = claimKey('scrap', scrapId);
  const outcome = await withClaim(key, async (runId) => runScrap(scrapId, false, await openJournal(key, runId)));

  if (outcome.kind === 'held') {
    throw new StockUserError(CLAIM_HELD_MESSAGE);
  }

  return { kind: 'done' };
};

// Discard on the insufficient-quantity pop-up removes the draft scrap. It runs under the scrap's claim, so a Validate
// running on it is never cut short, and a stopped Validate past its commit point keeps its claim for the resume.
export const discardScrap = async (scrapId: string) => {
  const key = claimKey('scrap', scrapId);
  const outcome = await withClaim(key, async (runId) => {
    if ((await openJournal(key, runId)).committed) {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    const [scrap] = await stockScraps.find<{ id: string; state: string }>({ id: { eq: scrapId } }, 'id state');

    if (scrap === undefined) {
      return;
    }
    if (scrap.state === SCRAP_STATE.DONE) {
      throw new StockUserError(DONE_SCRAP_DELETE_REASON);
    }
    await stockScraps.destroyMany([scrapId]);
  });

  if (outcome.kind === 'held') {
    throw new StockUserError(CLAIM_HELD_MESSAGE);
  }
};

export const resumeScrap = async (scrapId: string) => {
  const key = claimKey('scrap', scrapId);

  await withClaim(key, async (runId) => runScrap(scrapId, true, await openJournal(key, runId)));
};
