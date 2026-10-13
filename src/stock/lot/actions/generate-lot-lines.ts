import { randomUUID } from 'node:crypto';

import { derivedId } from 'src/shared/utils/derived-id.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { graphqlGenerateLotLinesStore } from 'src/stock/lot/actions/generate-lot-lines-store';
import { type GenerateLotLinesStore } from 'src/stock/lot/types/generate-lot-lines-store.type';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { planLotLines } from 'src/stock/utils/plan-lot-lines.util';
import { chunks } from 'src/shared/utils/chunks.util';

// Twenty's MUTATION_MAXIMUM_AFFECTED_RECORDS default.
const MUTATION_MAXIMUM_RECORDS = 100;

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const readNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const sameInstant = (left: string | null, right: string) => left !== null && Date.parse(left) === Date.parse(right);

// The pop-up sends one run id per opening. Each new line's id comes from the
// move, that run id and its place in the plan, so a second click or a rerun
// after a stop finds the lines already made instead of making them twice.
export const makeGenerateLotLines = (store: GenerateLotLinesStore) => async (body: Record<string, unknown>) => {
  const moveId = typeof body.moveId === 'string' && body.moveId.length > 0 ? body.moveId : null;
  const runId = typeof body.runId === 'string' && body.runId.length > 0 ? body.runId : randomUUID();
  const mode = body.mode === 'IMPORT' ? 'IMPORT' : 'GENERATE';

  if (moveId === null) {
    throw new StockUserError('Select one stock move you can see.');
  }
  const move = await store.readMove(moveId);

  if (move === null) {
    throw new StockUserError('Select one stock move you can see.');
  }
  if (move.state === MOVE_STATE.DONE || move.state === MOVE_STATE.CANCEL) {
    throw new StockUserError('Serials/lots can only be generated on a move that is not done or cancelled.');
  }
  const template = move.product?.productTmpl ?? null;
  const tracking =
    template?.tracking === PRODUCT_TRACKING.SERIAL || template?.tracking === PRODUCT_TRACKING.LOT ? template.tracking : null;

  if (template !== null && tracking === null) {
    throw new StockUserError('This product is not tracked by lots or serial numbers.');
  }
  const lotSequence = template?.lotSequence ?? null;
  const sequence =
    lotSequence === null
      ? null
      : {
          prefix: textOrNull(lotSequence.prefix) ?? '',
          padding: lotSequence.padding ?? 0,
          numberNext: lotSequence.numberNext ?? 1,
          numberIncrement: lotSequence.numberIncrement ?? 1,
        };
  const plan = planLotLines({
    mode,
    productFound: move.productId !== null && template !== null,
    tracking: tracking ?? PRODUCT_TRACKING.SERIAL,
    // An emptied "Quantity received" falls back to the demand.
    quantityReceived: readNumber(body.quantityReceived) ?? move.productQty ?? 0,
    firstLot: typeof body.firstLot === 'string' ? body.firstLot : '',
    count: readNumber(body.count) ?? 0,
    text: typeof body.text === 'string' ? body.text : '',
    useExpirationDate: template?.useExpirationDate === true,
    expirationTime: template?.expirationTime ?? 0,
    scheduledDate: textOrNull(move.picking?.scheduledDate) ?? null,
    today: startOfUtcDay(store.now()),
    dateOrder: await store.readDateOrder(),
    sequence,
  });

  if (plan.kind === 'refuse') {
    throw new StockUserError(plan.reason);
  }
  const { productId, locationId, locationDestId } = move;

  if (productId === null || locationId === null || locationDestId === null) {
    throw new StockUserError('The move needs a product and both locations.');
  }

  const lineIds = plan.lines.map((_, index) => derivedId(move.id, runId, String(index)));
  const ownIds = new Set(lineIds);
  const replacedIds =
    body.keepLines === true ? [] : (await store.readOpenLineIds(move.id)).filter((id) => !ownIds.has(id));
  const destinations = await store.putawayDestinations(
    plan.lines.map((line, index) => ({
      key: String(index),
      locationDestId,
      productId,
      quantity: line.quantity,
      packageId: null,
      packagingUomId: null,
      excludedLineIds: [...replacedIds, ...lineIds],
    })),
  );
  const pickingType = move.pickingType ?? move.picking?.pickingType ?? null;
  const lotIdByName =
    pickingType?.useExistingLots === true && plan.lines.length > 0
      ? await store.lotIdsByName(productId, plan.lines.map((line) => line.lotName))
      : null;

  await store.deleteLines(replacedIds);

  const unitId = tracking === PRODUCT_TRACKING.LOT ? move.productUomId : (template?.uomId ?? move.productUomId);
  const rows = plan.lines.map((line, index) => ({
    id: lineIds[index],
    data: {
      moveId: move.id,
      pickingId: move.pickingId,
      productId,
      productUomId: unitId,
      locationId,
      locationDestId: destinations.get(String(index)) ?? locationDestId,
      quantity: line.quantity,
      ...(lotIdByName === null ? { lotName: line.lotName } : { lotId: lotIdByName.get(line.lotName) ?? null }),
    },
  }));

  for (const part of chunks(rows, MUTATION_MAXIMUM_RECORDS)) {
    await store.createMissingLines(part);
  }

  const storedDates = plan.lines.some((line) => line.expirationDate !== null)
    ? await store.readExpirationDates(lineIds)
    : new Map<string, string | null>();
  const idsByDate = new Map<string, string[]>();

  plan.lines.forEach((line, index) => {
    const lineId = lineIds[index];

    if (line.expirationDate !== null && !sameInstant(storedDates.get(lineId) ?? null, line.expirationDate)) {
      idsByDate.set(line.expirationDate, [...(idsByDate.get(line.expirationDate) ?? []), lineId]);
    }
  });
  for (const [expirationDate, ids] of idsByDate) {
    await store.writeExpirationDate(ids, expirationDate);
  }

  if (plan.sequenceNumberNext !== null && lotSequence !== null && sequence !== null) {
    await store.jumpSequence(lotSequence.id, sequence.numberNext, plan.sequenceNumberNext);
  }

  return { lineIds };
};

export const generateLotLines = makeGenerateLotLines(graphqlGenerateLotLinesStore);
