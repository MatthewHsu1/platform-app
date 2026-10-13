import { CLAIM_HELD_MESSAGE, claimKey, openJournal, withClaim } from 'src/shared/claims/claim';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { translate } from 'src/shared/i18n/translate';
import { addNote } from 'src/shared/triggers/put-back';
import { nextNumber } from 'src/base/sequence/next-number';
import { readLocations } from 'src/stock/location/read-locations';
import { unreserveMoves } from 'src/stock/move/actions/unreserve-moves';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { assignPickings } from 'src/stock/picking/actions/assign-pickings';
import { hasPickingNote } from 'src/stock/picking/has-picking-note';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { type ReturnAction } from 'src/stock/picking/types/return-action.type';
import { type ReturnData } from 'src/stock/picking/types/return-data.type';
import { type ReturnPort } from 'src/stock/picking/types/return-port.type';
import { type ReturnResult } from 'src/stock/picking/types/return-result.type';
import { checkProcurements, runProcurements } from 'src/stock/procurement/plan-procurements-hook';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE, PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';
import { stockMoveMoveRels, stockMoves, stockPickings, stockPickingTypes, stockReferenceMoveRels } from 'src/stock/stock-records';
import { MOVE_ROW, PICKING_ROW, PICKING_TYPE_ROW } from 'src/stock/stock-rows';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { pickReturnType, planReturnMove, planReturnMoveLinks, planReturnPicking } from 'src/stock/utils/plan-return-picking.util';
import { applyTypedQuantities, hasNonZeroQuantity, planReturnAll, planReturnRows } from 'src/stock/utils/plan-return-rows.util';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ReturnLinkMove } from 'src/stock/utils/types/return-link-move.type';
import { type ReturnPickingValues } from 'src/stock/utils/types/return-picking-values.type';
import { type ReturnRow } from 'src/stock/utils/types/return-row.type';
import { type ReturnSourcePicking } from 'src/stock/utils/types/return-source-picking.type';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ClaimKey } from 'src/shared/claims/types/claim-key.type';
import { type ProcurementRequest } from 'src/stock/procurement/types/procurement-request.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

type Row = Record<string, unknown> & { id: string };

// `note` is the copied rich-text field; `message` the note that links the transfer to its source.
type TransferPlan = {
  picking: ReturnPickingValues;
  note: unknown;
  moves: Row[];
  links: Row[];
  referenceLinks: Row[];
  message: string;
};

type ReturnPlan = {
  unreserveMoveIds: string[];
  returnTransfer: TransferPlan;
  exchange: { kind: 'transfer'; transfer: TransferPlan } | { kind: 'procure'; requests: ProcurementRequest[] } | null;
};

type ReturnRequest = { data: ReturnData; rows: ReturnRow[]; isExchange: boolean; locale: string };

const CLOSED_MOVE_STATES: MoveState[] = [MOVE_STATE.DONE, MOVE_STATE.CANCEL];

export const makeReturnPicking = (port: ReturnPort) => {
  const rowMoves = (data: ReturnData) =>
    data.moves.map((move) => ({
      id: move.id,
      productId: move.productId,
      productUomId: move.productUomId,
      state: move.state,
      locationDestUsage: move.locationDestId === null ? null : (data.locationUsage.get(move.locationDestId) ?? null),
    }));

  const readRows = async (pickingIds: string[]) => {
    if (pickingIds.length !== 1) {
      throw new StockUserError('You may only return one picking at a time.');
    }
    const data = await port.readReturnData(pickingIds[0]);
    const plan = planReturnRows({ pickingCount: 1, pickingState: data.picking.state, moves: rowMoves(data) });

    if (plan.kind === 'refuse') {
      throw new StockUserError(plan.reason);
    }

    return { data, rows: plan.rows };
  };

  const planTransfer = async ({
    data,
    source,
    rows,
    isExchange,
    locale,
  }: {
    data: ReturnData;
    source: ReturnSourcePicking;
    rows: ReturnRow[];
    isExchange: boolean;
    locale: string;
  }): Promise<TransferPlan> => {
    const sourceType = data.types.get(source.pickingTypeId ?? '');

    if (sourceType === undefined) {
      throw new StockUserError('The operation type of {name} is missing.', { name: source.name ?? '' });
    }
    const returnType = pickReturnType({ pickingType: sourceType, types: data.types });
    const picking = planReturnPicking({
      id: port.newId(),
      name: await port.nextPickingName(returnType.referenceSequenceId),
      origin: translate(locale, 'Return of {name}', { name: source.name ?? '' }),
      picking: source,
      pickingType: sourceType,
      types: data.types,
    });
    const moveById = new Map(data.moves.map((move) => [move.id, move]));
    const newMoveSourcePath = picking.locationId === null ? null : (data.locationPath.get(picking.locationId) ?? null);
    const moves: Row[] = [];
    const links: Row[] = [];
    const referenceLinks: Row[] = [];

    for (const row of rows.filter((candidate) => !isZeroAtDigits(candidate.quantity, port.digits()))) {
      const move = moveById.get(row.moveId);

      if (move === undefined) {
        continue;
      }
      const newMove = planReturnMove({
        id: port.newId(),
        move,
        quantity: row.quantity,
        uomId: row.uomId,
        picking,
        pickingType: returnType,
        now: port.now(),
        isExchange,
      });
      const { origIds, destIds } = planReturnMoveLinks({ moveId: move.id, newMoveSourcePath, graph: data.graph, isExchange });

      moves.push(newMove);
      origIds.forEach((moveOrigId) => links.push({ id: port.newId(), moveOrigId, moveDestId: newMove.id }));
      destIds.forEach((moveDestId) => links.push({ id: port.newId(), moveOrigId: newMove.id, moveDestId }));
      data.referenceIds.forEach((referenceId) => referenceLinks.push({ id: port.newId(), referenceId, moveId: newMove.id }));
    }

    return {
      picking,
      note: data.note,
      moves,
      links,
      referenceLinks,
      message: translate(locale, 'This transfer was created from {name}.', { name: source.name ?? '' }),
    };
  };

  // An exchange of a delivery asks the rules for the replacement: one procurement per row.
  const exchangeProcurements = (data: ReturnData, rows: ReturnRow[]): ProcurementRequest[] => {
    const moveById = new Map(data.moves.map((move) => [move.id, move]));
    const warehouseId = data.types.get(data.picking.pickingTypeId ?? '')?.warehouseId ?? null;

    return rows.flatMap((row) => {
      const move = moveById.get(row.moveId);

      if (move === undefined) {
        return [];
      }

      return [
        {
          productId: row.productId,
          productQty: row.quantity,
          productUomId: row.uomId ?? move.productUomId ?? '',
          locationId: move.locationDestId ?? data.picking.locationDestId ?? '',
          name: data.productNames.get(row.productId) ?? row.productId,
          origin: data.picking.origin ?? '',
          values: {
            references: data.referenceIds,
            datePlanned: move.date ?? port.now(),
            warehouse: warehouseId,
            partner: data.picking.personId ?? data.picking.companyId,
            locationFinal: move.locationFinalId ?? data.picking.locationDestId,
          },
        },
      ];
    });
  };

  const buildPlan = async ({ data, rows, isExchange, locale }: ReturnRequest): Promise<ReturnPlan> => {
    const returnTransfer = await planTransfer({ data, source: data.picking, rows, isExchange: false, locale });
    // Every row's move, typed quantity or not.
    const unreserveMoveIds = [
      ...new Set(
        rows.flatMap((row) =>
          (data.graph.get(row.moveId)?.moveDestIds ?? []).filter((destinationId) => {
            const state = data.graph.get(destinationId)?.state;
            return state !== undefined && !CLOSED_MOVE_STATES.includes(state);
          }),
        ),
      ),
    ];

    if (!isExchange) {
      return { unreserveMoveIds, returnTransfer, exchange: null };
    }
    if (data.types.get(data.picking.pickingTypeId ?? '')?.code === PICKING_TYPE_CODE.INCOMING) {
      return {
        unreserveMoveIds,
        returnTransfer,
        exchange: {
          kind: 'transfer',
          transfer: await planTransfer({ data, source: returnTransfer.picking, rows, isExchange: true, locale }),
        },
      };
    }

    return { unreserveMoveIds, returnTransfer, exchange: { kind: 'procure', requests: exchangeProcurements(data, rows) } };
  };

  const runTransferSteps = async (journal: ClaimJournal, prefix: string, transfer: TransferPlan) => {
    await journal.step(
      `${prefix}:picking`,
      async () => transfer,
      (stored) => port.createPickings([{ ...stored.picking, note: stored.note }]),
    );
    await journal.step(
      `${prefix}:moves`,
      async () => transfer,
      async (stored) => {
        await port.createMoves(stored.moves);
        await port.createMoveLinks(stored.links);
        await port.createReferenceLinks(stored.referenceLinks);
        await port.recompute(
          stored.picking.id,
          stored.moves.map((move) => move.id),
        );
      },
    );
    await journal.step(
      `${prefix}:note`,
      async () => transfer,
      (stored) => port.addPickingNote(stored.picking.id, stored.message),
    );
    await journal.step(
      `${prefix}:confirm`,
      async () => transfer,
      (stored) => port.confirmAndAssign(stored.picking.id),
    );
  };

  // `request` null: a resume, which finishes only a run that passed its commit point; a run that
  // stopped before it wrote nothing but a transfer number, and its claim is freed.
  const run = async (key: ClaimKey, runId: string, request: ReturnRequest | null): Promise<ReturnResult | null> => {
    const journal = await port.openJournal(key, runId);

    if (request === null && !journal.committed) {
      return null;
    }
    const plan = await journal.step<ReturnPlan | null>(
      'return:plan',
      async () => (request === null ? null : buildPlan(request)),
      async () => {},
    );

    if (plan === null) {
      return null;
    }
    const exchange = plan.exchange;

    // An exchange that cannot be procured refuses the return before anything is written.
    if (!journal.committed) {
      await port.checkProcurements(exchange?.kind === 'procure' ? exchange.requests : [], { journal });
    }
    await journal.commit();
    await journal.step(
      'return:unreserve',
      async () => plan.unreserveMoveIds,
      (moveIds) => port.unreserveMoves(moveIds),
    );
    await runTransferSteps(journal, 'return', plan.returnTransfer);

    if (exchange?.kind === 'transfer') {
      await runTransferSteps(journal, 'exchange', exchange.transfer);
    }
    if (exchange?.kind === 'procure') {
      await journal.step(
        'exchange:procure',
        async () => exchange.requests,
        (requests) => port.runProcurements(requests, { journal }),
      );
    }

    return {
      returnPickingId: plan.returnTransfer.picking.id,
      returnPickingName: plan.returnTransfer.picking.name,
      exchangePickingId: exchange?.kind === 'transfer' ? exchange.transfer.picking.id : null,
    };
  };

  const readReturnRows = async (pickingIds: string[]) => {
    const { data, rows } = await readRows(pickingIds);
    const code = data.types.get(data.picking.pickingTypeId ?? '')?.code;

    return { rows, canExchange: code === PICKING_TYPE_CODE.INCOMING || code === PICKING_TYPE_CODE.OUTGOING };
  };

  const returnPicking = async ({
    pickingIds,
    rows,
    action,
    locale,
  }: {
    pickingIds: string[];
    rows: { moveId: string; quantity: number }[];
    action: ReturnAction;
    locale: string;
  }): Promise<ReturnResult> => {
    const { data, rows: planned } = await readRows(pickingIds);
    const wanted =
      action === 'returnAll'
        ? planReturnAll({
            rows: planned,
            digits: port.digits(),
            moves: data.moves.map((move) => ({
              id: move.id,
              quantity: move.quantity,
              destinationMoves: data.destinationMoves.get(move.id) ?? [],
            })),
          })
        : applyTypedQuantities(planned, rows);

    if (!hasNonZeroQuantity(wanted, port.digits())) {
      throw new StockUserError('Please specify at least one non-zero quantity.');
    }
    const key = claimKey('return', data.picking.id);
    const outcome = await port.withClaim(key, (runId) =>
      run(key, runId, { data, rows: wanted, isExchange: action === 'exchange', locale }),
    );

    if (outcome.kind === 'held') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    if (outcome.result === null) {
      throw new Error('The return finished without a plan.');
    }

    return outcome.result;
  };

  // The daily job (or a later click) finishes a stopped return from its stored plan.
  const resumeReturn = async (pickingId: string) => {
    const key = claimKey('return', pickingId);

    await port.withClaim(key, (runId) => run(key, runId, null));
  };

  return { readReturnRows, returnPicking, resumeReturn };
};

type MoveLite = {
  id: string;
  state: MoveState;
  locationDestId: string | null;
  originReturnedMoveId: string | null;
  quantity: number | null;
};

// The moves around the returned ones, joined by links and by returns. The rule reads at most
// three steps away (the destinations of the origins of the returns of the origins), so four rounds.
const loadLinkGraph = async (startIds: string[]) => {
  const known = new Map<string, MoveLite>();
  const relations: { moveOrigId: string; moveDestId: string }[] = [];
  const seenLinks = new Set<string>();
  let frontier = [...new Set(startIds)];

  for (let round = 0; round < 4 && frontier.length > 0; round += 1) {
    const found = await stockMoves.find<MoveLite>(
      { or: [{ id: { in: frontier } }, { originReturnedMoveId: { in: frontier } }] },
      'id state locationDestId originReturnedMoveId quantity',
    );
    found.forEach((move) => known.set(move.id, move));
    const ids = [...new Set([...frontier, ...found.map((move) => move.id)])];
    const links = await stockMoveMoveRels.find<{ moveOrigId: string; moveDestId: string }>(
      { or: [{ moveOrigId: { in: ids } }, { moveDestId: { in: ids } }] },
      'moveOrigId moveDestId',
    );

    for (const link of links) {
      const pair = `${link.moveOrigId}|${link.moveDestId}`;

      if (!seenLinks.has(pair)) {
        seenLinks.add(pair);
        relations.push(link);
      }
    }
    frontier = [...new Set(links.flatMap((link) => [link.moveOrigId, link.moveDestId]))].filter((id) => !known.has(id));
  }

  return { known, relations };
};

const NOTE_SELECTION = 'note { blocknote markdown }';

const moveOrder = (left: MoveRow, right: MoveRow) =>
  (left.sequence ?? 10) - (right.sequence ?? 10) || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);

const readReturnData = async (pickingId: string): Promise<ReturnData> => {
  const [found] = await stockPickings.find<PickingRow & { note: unknown }>(
    { id: { eq: pickingId } },
    `${PICKING_ROW} ${NOTE_SELECTION}`,
  );

  if (found === undefined) {
    throw new StockUserError('Transfer not found.');
  }
  const { note, ...picking } = found;
  const types = new Map<string, PickingTypeRow>();
  let toRead = [picking.pickingTypeId].filter((id): id is string => id !== null);

  // The type, its return type and that one's return type (the exchange).
  for (let depth = 0; depth < 3 && toRead.length > 0; depth += 1) {
    const read = await stockPickingTypes.find<PickingTypeRow>({ id: { in: toRead } }, PICKING_TYPE_ROW);
    read.forEach((type) => types.set(type.id, type));
    toRead = read.map((type) => type.returnPickingTypeId).filter((id): id is string => id !== null && !types.has(id));
  }
  const moves = (await stockMoves.find<MoveRow>({ pickingId: { eq: pickingId } }, MOVE_ROW)).sort(moveOrder);
  const { known, relations } = await loadLinkGraph(moves.map((move) => move.id));
  const locationIds = [
    picking.locationId,
    picking.locationDestId,
    ...moves.flatMap((move) => [move.locationId, move.locationDestId]),
    ...[...known.values()].map((move) => move.locationDestId),
    ...[...types.values()].map((type) => type.defaultLocationDestId),
  ].filter((id): id is string => id !== null);
  const [locations, products, references] = await Promise.all([
    readLocations([...new Set(locationIds)]),
    readStockProducts(moves.map((move) => move.productId)),
    moves.length === 0
      ? Promise.resolve([])
      : stockReferenceMoveRels.find<{ referenceId: string }>({ moveId: { in: moves.map((move) => move.id) } }, 'referenceId'),
  ]);
  const destinationIdsOf = (moveId: string) =>
    relations.filter((link) => link.moveOrigId === moveId).map((link) => link.moveDestId);
  const graph = new Map<string, ReturnLinkMove>(
    [...known.values()].map((move) => [
      move.id,
      {
        id: move.id,
        state: move.state,
        locationDestPath: move.locationDestId === null ? null : (locations.get(move.locationDestId)?.parentPath ?? null),
        originReturnedMoveId: move.originReturnedMoveId,
        moveOrigIds: relations.filter((link) => link.moveDestId === move.id).map((link) => link.moveOrigId),
        moveDestIds: destinationIdsOf(move.id),
      },
    ]),
  );

  return {
    picking,
    note,
    types,
    moves,
    productNames: new Map([...products.values()].map((product) => [product.productId, product.displayName])),
    locationUsage: new Map([...locations.values()].map((location) => [location.id, location.usage])),
    locationPath: new Map([...locations.values()].map((location) => [location.id, location.parentPath])),
    graph,
    destinationMoves: new Map(
      moves.map((move) => [
        move.id,
        destinationIdsOf(move.id).flatMap((destinationId) => {
          const destination = known.get(destinationId);
          return destination === undefined
            ? []
            : [{ originReturnedMoveId: destination.originReturnedMoveId, quantity: destination.quantity }];
        }),
      ]),
    ),
    referenceIds: [...new Set(references.map((reference) => reference.referenceId))],
  };
};

const createRows = (of: Parameters<typeof createMissingRows>[0]) => async (rows: Row[]) => {
  await createMissingRows(
    of,
    rows.map(({ id, ...data }) => ({ id, data })),
  );
};

const graphqlReturnPort: ReturnPort = {
  digits: () => readStockSettings().productUnitDigits,
  now: nowIso,
  newId: () => crypto.randomUUID(),
  readReturnData,
  nextPickingName: async (sequenceId) => (sequenceId === null ? '/' : nextNumber(sequenceId)),
  withClaim,
  openJournal,
  unreserveMoves,
  createPickings: createRows(stockPickings),
  createMoves: createRows(stockMoves),
  createMoveLinks: createRows(stockMoveMoveRels),
  createReferenceLinks: createRows(stockReferenceMoveRels),
  recompute: async (pickingId, moveIds) => {
    await recomputeMove(moveIds);
    await recomputePickingState([pickingId]);
  },
  addPickingNote: async (pickingId, text) => {
    if (!(await hasPickingNote(pickingId, text))) {
      await addNote({ objectSingular: 'stockPicking', recordId: pickingId, title: text, body: text });
    }
  },
  // Mark as Todo (on a draft transfer) then Check Availability; a rerun after a stop finds it confirmed.
  confirmAndAssign: (pickingId) => assignPickings([pickingId]),
  runProcurements,
  checkProcurements,
};

const engine = makeReturnPicking(graphqlReturnPort);

export const returnPicking = engine.returnPicking;
export const resumeReturn = engine.resumeReturn;

// The pop-up rows, with the names the pop-up shows.
export const readReturnRows = async (pickingIds: string[]) => {
  const { rows, canExchange } = await engine.readReturnRows(pickingIds);
  const [products, uoms] = await Promise.all([readStockProducts(rows.map((row) => row.productId)), readResolvedUoms()]);

  return {
    canExchange,
    rows: rows.map((row) => ({
      ...row,
      productName: products.get(row.productId)?.displayName ?? '',
      uomName: row.uomId === null ? '' : (uoms.get(row.uomId)?.name ?? ''),
    })),
  };
};
