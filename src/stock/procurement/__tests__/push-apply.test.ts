import { describe, expect, it } from 'vitest';

import { memoryJournal } from 'src/stock/__tests__/fakes/fake-stock-db';
import { makePushApply, pushedMoveId } from 'src/stock/procurement/push-apply';
import { makeApplyQuantDelta } from 'src/stock/quant/apply-quant-delta';
import { destinationKeyOf, parseQuantKey, sourceKeyOf } from 'src/stock/quant/quant-key';
import { makeSettleQuantDelta } from 'src/stock/quant/settle-quant-delta';
import { locations, product, route, routingData, rule, warehouseWorld } from 'src/stock/utils/procurement/__tests__/routing-fixture';
import { type PushStore } from 'src/stock/procurement/types/push-store.type';
import { type PutawayRequest } from 'src/stock/putaway/types/putaway-request.type';
import { type QuantSnapshot } from 'src/stock/quant/types/quant-snapshot.type';
import { type QuantStore } from 'src/stock/quant/types/quant-store.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';

const DONE_AT = '2026-10-10T12:00:00.000Z';
const OPENING_IN_DATE = '2026-01-01T00:00:00.000Z';
const QUANT_NOW = '2026-10-10T13:00:00.000Z';

type FakeMove = {
  id: string;
  state: string;
  productId: string;
  productUomQty: number;
  quantity: number;
  locationId: string;
  locationDestId: string;
  locationFinalId: string | null;
  date: string;
  procureMethod: string;
  ruleId: string | null;
  pickingName: string | null;
  values: Record<string, unknown>;
};
type FakeLine = { id: string; moveId: string; productId: string; quantity: number; locationId: string; locationDestId: string };

// Rows in memory behind the push store; the stock levels go through the real
// quant engine. Every write is counted and the run can be stopped right after any of them.
// `putawayTo` says where stock arriving in a location is stored instead.
const fakePushDb = (data: RoutingData, products: RoutingProduct[], putawayTo: Record<string, string> = {}) => {
  const moves = new Map<string, FakeMove>();
  const lines = new Map<string, FakeLine>();
  const moveLinks = new Map<string, { moveOrigId: string; moveDestId: string }>();
  const routeLinks = new Map<string, Record<string, unknown>>();
  const referenceLinks = new Map<string, Record<string, unknown>>();
  const quants = new Map<string, QuantSnapshot>();
  const counter = { writes: 0, stopAfter: null as number | null };
  const putawayRequests: PutawayRequest[] = [];
  // Each product's stock by internal location, as its quantities were last recomputed.
  const productQuantities = new Map<string, string[]>();

  const wrote = () => {
    counter.writes += 1;
    if (counter.writes === counter.stopAfter) {
      throw new Error('stopped');
    }
  };
  const ledgerTotal = (key: string) =>
    [...lines.values()].reduce(
      (total, line) => total + (destinationKeyOf({ ...line, ownerId: null }) === key ? line.quantity : 0) - (sourceKeyOf({ ...line, ownerId: null }) === key ? line.quantity : 0),
      0,
    );
  const quantStore: QuantStore = {
    findByKey: async (key) => {
      const quant = quants.get(key);
      return quant === undefined ? null : { ...quant };
    },
    create: async (key, values) => {
      if (quants.has(key)) {
        return null;
      }
      quants.set(key, {
        id: `quant-${quants.size + 1}`,
        quantKey: key,
        quantity: values.quantity,
        reservedQuantity: values.reservedQuantity,
        inDate: values.inDate,
        version: 0,
        inventoryQuantitySet: false,
        inventoryQuantity: null,
        inventoryDiffQuantity: null,
      });
      wrote();
      return { ...(quants.get(key) as QuantSnapshot) };
    },
    compareAndSet: async (id, version, values) => {
      const quant = [...quants.values()].find((row) => row.id === id);

      if (quant === undefined || quant.version !== version) {
        return false;
      }
      quants.set(quant.quantKey, { ...quant, ...(values as Partial<QuantSnapshot>) });
      wrote();
      return true;
    },
    locationUsage: async (locationId) => data.locations.get(locationId)?.usage ?? 'INTERNAL',
    openLines: async () => [],
    destroyLines: async () => {},
    shrinkLine: async () => {},
    ledgerTotal: async (key) => ledgerTotal(key),
    wait: async () => {},
    now: () => QUANT_NOW,
    digits: () => 2,
  };
  const createMissing =
    (table: Map<string, Record<string, unknown>>) =>
    async (rows: { id: string; data: Record<string, unknown> }[]) => {
      for (const row of rows) {
        if (!table.has(row.id)) {
          table.set(row.id, structuredClone(row.data));
        }
      }
      if (rows.length > 0) {
        wrote();
      }
    };
  const routing = { data, products: new Map(products.map((item) => [item.id, item])) };

  const store: PushStore = {
    readRouting: async () => routing,
    readDoneMoves: async (moveIds) =>
      moveIds.flatMap((id) => {
        const move = moves.get(id);

        if (move === undefined || move.state !== 'DONE') {
          return [];
        }
        const downstream = [...moveLinks.values()]
          .filter((link) => link.moveOrigId === id)
          .map((link) => moves.get(link.moveDestId))
          .filter((row): row is FakeMove => row !== undefined)
          .map((row) => ({ id: row.id, locationId: row.locationId, ruleId: row.ruleId }));

        return [
          {
            id: move.id,
            productId: move.productId,
            productUomId: 'unit',
            quantity: move.quantity,
            productUomQty: move.productUomQty,
            locationId: move.locationId,
            locationDestId: move.locationDestId,
            locationFinalId: move.locationFinalId,
            date: move.date,
            dateDeadline: null,
            warehouseId: 'WH',
            pickingTypeWarehouseId: 'WH',
            routeIds: [],
            resultPackageTypeRouteIds: [],
            packagingUomId: 'unit',
            isInventory: false,
            originReturnedMoveDestId: null,
            origin: null,
            pickingName: move.pickingName,
            companyId: null,
            personId: null,
            partnerCustomerLocationId: null,
            restrictPartnerId: null,
            descriptionPickingManual: null,
            sequence: 10,
            referenceIds: ['ref-1'],
            filterRecord: {
              productUomQty: move.productUomQty,
              quantity: move.quantity,
              origin: null,
              priority: 'NORMAL',
              date: move.date,
              product: { name: 'Desk Combination', defaultCode: null, barcode: null },
              category: null,
              picking: null,
            },
            moveDests: downstream,
          },
        ];
      }),
    readLines: async (moveId) =>
      [...lines.values()]
        .filter((line) => line.moveId === moveId)
        .map((line) => ({ id: line.id, locationDestId: line.locationDestId, quantityProductUom: line.quantity, lotId: null, resultPackageId: null, ownerId: null })),
    createMoves: async (rows) => {
      for (const row of rows) {
        if (!moves.has(row.id)) {
          const values = row.data as Record<string, string | number | null>;
          moves.set(row.id, {
            id: row.id,
            state: String(values.state),
            productId: String(values.productId),
            productUomQty: Number(values.productUomQty),
            quantity: 0,
            locationId: String(values.locationId),
            locationDestId: String(values.locationDestId),
            locationFinalId: values.locationFinalId === null ? null : String(values.locationFinalId),
            date: String(values.date),
            procureMethod: String(values.procureMethod),
            ruleId: values.ruleId === null ? null : String(values.ruleId),
            pickingName: null,
            values: structuredClone(row.data),
          });
        }
      }
      if (rows.length > 0) {
        wrote();
      }
    },
    linkMoves: createMissing(moveLinks as Map<string, Record<string, unknown>>),
    linkRoutes: createMissing(routeLinks),
    linkReferences: createMissing(referenceLinks),
    setPartner: async () => {},
    confirm: async (moveIds) => {
      for (const id of moveIds) {
        const move = moves.get(id);
        if (move !== undefined && move.state === 'DRAFT') {
          move.state = [...moveLinks.values()].some((link) => link.moveDestId === id) ? 'WAITING' : 'CONFIRMED';
        }
      }
      wrote();
    },
    unlinkMoves: async (moveOrigId, moveDestIds) => {
      for (const [id, link] of moveLinks) {
        if (link.moveOrigId === moveOrigId && moveDestIds.includes(link.moveDestId)) {
          moveLinks.delete(id);
        }
      }
      wrote();
    },
    makeToStock: async (moveIds) => {
      moveIds.forEach((id) => {
        const move = moves.get(id);
        if (move !== undefined) {
          move.procureMethod = 'MAKE_TO_STOCK';
        }
      });
      wrote();
    },
    recomputeMove: async () => {
      wrote();
    },
    setLineDestination: async (lineId, locationDestId) => {
      const line = lines.get(lineId);
      if (line !== undefined) {
        line.locationDestId = locationDestId;
      }
      wrote();
    },
    setMoveDestination: async (moveId, { date, locationDestId }) => {
      const move = moves.get(moveId);
      if (move !== undefined) {
        move.date = date;
        move.locationDestId = locationDestId;
      }
      wrote();
    },
    applyQuantDelta: makeApplyQuantDelta(quantStore),
    settleQuantDelta: makeSettleQuantDelta(quantStore),
    recomputeProductQuantities: async (productIds) => {
      for (const productId of productIds) {
        productQuantities.set(
          productId,
          [...quants.values()]
            .map((quant) => ({ key: parseQuantKey(quant.quantKey), quantity: quant.quantity }))
            .filter(({ key, quantity }) => key.productId === productId && quantity !== 0 && data.locations.get(key.locationId)?.usage === 'INTERNAL')
            .map(({ key, quantity }) => `${key.locationId}=${quantity}`)
            .sort(),
        );
      }
      wrote();
    },
    recomputeTrackingForKeys: async () => {},
    putawayDestinations: async (requests) => {
      putawayRequests.push(...requests);
      return new Map(requests.map((request) => [request.key, putawayTo[request.locationDestId] ?? request.locationDestId]));
    },
  };

  const addMove = (move: Partial<FakeMove> & Pick<FakeMove, 'id' | 'locationId' | 'locationDestId'>) => {
    moves.set(move.id, {
      state: 'DONE',
      productId: 'product',
      productUomQty: 0,
      quantity: 0,
      locationFinalId: null,
      date: DONE_AT,
      procureMethod: 'MAKE_TO_STOCK',
      ruleId: null,
      pickingName: null,
      values: {},
      ...move,
    });
  };
  const addLine = (line: Omit<FakeLine, 'productId' | 'locationId' | 'locationDestId'>) => {
    const move = moves.get(line.moveId) as FakeMove;
    lines.set(line.id, { ...line, productId: move.productId, locationId: move.locationId, locationDestId: move.locationDestId });
  };
  const link = (moveOrigId: string, moveDestId: string) => moveLinks.set(`${moveOrigId}>${moveDestId}`, { moveOrigId, moveDestId });
  // The stock the done lines left behind, as the done run posted it.
  const postLedger = () => {
    const keys = new Set([...lines.values()].flatMap((line) => [sourceKeyOf({ ...line, ownerId: null }), destinationKeyOf({ ...line, ownerId: null })]));
    for (const key of keys) {
      quants.set(key, {
        id: `quant-${quants.size + 1}`,
        quantKey: key,
        quantity: ledgerTotal(key),
        reservedQuantity: 0,
        inDate: OPENING_IN_DATE,
        version: 0,
        inventoryQuantitySet: false,
        inventoryQuantity: null,
        inventoryDiffQuantity: null,
      });
    }
  };
  const snapshot = () => ({
    moves: Object.fromEntries(
      [...moves.values()].map((move) => [
        move.id,
        {
          state: move.state,
          locationId: move.locationId,
          locationDestId: move.locationDestId,
          locationFinalId: move.locationFinalId,
          date: move.date,
          procureMethod: move.procureMethod,
          ruleId: move.ruleId,
          productUomQty: move.productUomQty,
        },
      ]),
    ),
    moveLinks: [...moveLinks.values()].map((row) => `${row.moveOrigId}>${row.moveDestId}`).sort(),
    routeLinks: [...routeLinks.values()],
    referenceLinks: [...referenceLinks.values()],
    lines: Object.fromEntries([...lines.values()].map((line) => [line.id, line.locationDestId])),
    quants: [...quants.values()]
      .filter((quant) => parseQuantKey(quant.quantKey).locationId !== 'vendors')
      .map((quant) => `${parseQuantKey(quant.quantKey).locationId}=${quant.quantity}@${quant.inDate}`)
      .sort(),
    productQuantities: Object.fromEntries(productQuantities),
  });

  return { store, routing, moves, counter, putawayRequests, addMove, addLine, link, postLedger, snapshot };
};

const MANY = 30;
const range = (count: number) => Array.from({ length: count }, (_, index) => index);

// Receipts into Input, made to end in Stock, that two later moves each wait
// on: a delivery from Stock and a move from Output.
const receiptsIntoInput = (count = 1) => {
  const world = warehouseWorld({ reception: 'TWO_STEPS' });
  const db = fakePushDb(
    routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds }),
    [product()],
  );

  for (const index of range(count)) {
    db.addMove({ id: `receipt-${index}`, locationId: 'vendors', locationDestId: 'input', locationFinalId: 'stock', productUomQty: 4, quantity: 4, pickingName: 'WH/IN/00001' });
    db.addLine({ id: `receipt-line-${index}`, moveId: `receipt-${index}`, quantity: 4 });
    db.addMove({ id: `delivery-${index}`, state: 'WAITING', locationId: 'stock', locationDestId: 'customers', procureMethod: 'MAKE_TO_ORDER', productUomQty: 4 });
    db.addMove({ id: `from-output-${index}`, state: 'WAITING', locationId: 'output', locationDestId: 'customers', procureMethod: 'MAKE_TO_ORDER', productUomQty: 4 });
    db.link(`receipt-${index}`, `delivery-${index}`);
    db.link(`receipt-${index}`, `from-output-${index}`);
  }
  db.postLedger();

  return db;
};

const stockLocations = () =>
  locations({
    vendors: { name: 'Vendors', usage: 'SUPPLIER' },
    wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
    stock: { name: 'Stock', parentId: 'wh' },
    shelf: { name: 'Shelf', parentId: 'stock' },
    qc: { name: 'Quality Control', parentId: 'wh' },
    bin: { name: 'Bin', parentId: 'qc' },
    output: { name: 'Output', parentId: 'wh' },
  });

const autoRoute = route('auto-route');
const movedOnToQc = rule(
  'auto',
  { routeId: 'auto-route', action: 'PUSH', auto: 'TRANSPARENT', delay: 1, locationSrcId: 'stock', locationDestId: 'qc', pickingTypeId: 'INT' },
  [autoRoute],
);

// Receipts into Stock whose route moves the stock on to Quality Control, a day later, with no new step.
const receiptsMovedOn = (count = 1, extraRules: ReturnType<typeof rule>[] = [], putawayTo: Record<string, string> = {}) => {
  const db = fakePushDb(
    routingData({ locationMap: stockLocations(), routes: [autoRoute], rules: [movedOnToQc, ...extraRules] }),
    [product({ routeIds: ['auto-route'] })],
    putawayTo,
  );

  for (const index of range(count)) {
    const id = count === 1 ? 'receipt' : `receipt-${index}`;
    db.addMove({ id, locationId: 'vendors', locationDestId: 'stock', productUomQty: 5, quantity: 5 });
    db.addLine({ id: `${id}-line-a`, moveId: id, quantity: 2 });
    db.addLine({ id: `${id}-line-b`, moveId: id, quantity: 3 });
  }
  db.postLedger();

  return db;
};

// The same receipts, and from Quality Control a rule with a step of its own on to Output.
const receiptsMovedOnThenChecked = (count = 1) =>
  receiptsMovedOn(count, [
    rule('check', { routeId: 'auto-route', action: 'PUSH', locationSrcId: 'qc', locationDestId: 'output', pickingTypeId: 'QC-OUT', procureMethod: 'MAKE_TO_ORDER' }, [
      autoRoute,
    ]),
  ]);

// The same receipts, whose stock arriving in Quality Control is stored in its bin.
const receiptsMovedOnIntoBin = (count = 1) => receiptsMovedOn(count, [], { qc: 'bin' });

// The same receipts, moved on twice: to Quality Control, then to Output.
const receiptsMovedOnTwice = (count = 1) =>
  receiptsMovedOn(count, [
    rule('auto-on', { routeId: 'auto-route', action: 'PUSH', auto: 'TRANSPARENT', locationSrcId: 'qc', locationDestId: 'output', pickingTypeId: 'INT' }, [
      autoRoute,
    ]),
  ]);

const allReceipts = (count: number) => range(count).map((index) => `receipt-${index}`);

describe('pushApply', () => {
  it('makes the next step from the done receipt, hangs the delivery on it and cuts the move it no longer feeds', async () => {
    const db = receiptsIntoInput();
    const newId = pushedMoveId('receipt-0');

    await makePushApply(db.store)(['receipt-0'], { journal: memoryJournal() });

    expect(db.snapshot()).toMatchObject({
      moves: {
        [newId]: {
          state: 'WAITING',
          locationId: 'input',
          locationDestId: 'stock',
          locationFinalId: 'stock',
          procureMethod: 'MAKE_TO_ORDER',
          ruleId: 'store',
          productUomQty: 4,
          date: DONE_AT,
        },
        'from-output-0': { procureMethod: 'MAKE_TO_STOCK' },
        'delivery-0': { procureMethod: 'MAKE_TO_ORDER' },
      },
      moveLinks: [`${newId}>delivery-0`, `receipt-0>${newId}`].sort(),
      referenceLinks: [{ moveId: newId, referenceId: 'ref-1' }],
    });
    expect(db.moves.get(newId)?.values).toMatchObject({ origin: 'WH/IN/00001', pickingTypeId: 'STOR', warehouseId: 'WH', priority: 'NORMAL', sequence: 10 });
  });

  it('moves the done stock on to the rule destination a day later, keeping the stock total', async () => {
    const db = receiptsMovedOn();

    await makePushApply(db.store)(['receipt'], { journal: memoryJournal() });

    expect(db.snapshot()).toMatchObject({
      moves: { receipt: { locationDestId: 'qc', date: '2026-10-11T12:00:00.000Z' } },
      lines: { 'receipt-line-a': 'qc', 'receipt-line-b': 'qc' },
      quants: [`qc=5@${QUANT_NOW}`, `stock=0@${OPENING_IN_DATE}`],
      productQuantities: { product: ['qc=5'] },
    });
  });

  it('stores the moved done lines where stock arriving in the rule destination goes, the move keeping the rule destination', async () => {
    const db = receiptsMovedOnIntoBin();

    await makePushApply(db.store)(['receipt'], { journal: memoryJournal() });

    expect(db.snapshot()).toMatchObject({
      moves: { receipt: { locationDestId: 'qc', date: '2026-10-11T12:00:00.000Z' } },
      lines: { 'receipt-line-a': 'bin', 'receipt-line-b': 'bin' },
      quants: [`bin=5@${QUANT_NOW}`, `stock=0@${OPENING_IN_DATE}`],
    });
    expect(db.putawayRequests).toEqual([
      { key: 'receipt', locationDestId: 'qc', productId: 'product', quantity: 0, packageId: null, packagingUomId: null, arrivingQuantity: 5 },
    ]);
  });

  it('cuts the moves fed from outside when a rule with no step added keeps the destination', async () => {
    const db = fakePushDb(
      routingData({
        locationMap: stockLocations(),
        routes: [autoRoute],
        rules: [rule('keep', { routeId: 'auto-route', action: 'PUSH', auto: 'TRANSPARENT', delay: 1, locationSrcId: 'stock', locationDestId: 'shelf', pickingTypeId: 'INT' }, [autoRoute])],
      }),
      [product({ routeIds: ['auto-route'] })],
    );
    db.addMove({ id: 'receipt', locationId: 'vendors', locationDestId: 'shelf', productUomQty: 5, quantity: 5 });
    db.addLine({ id: 'receipt-line', moveId: 'receipt', quantity: 5 });
    db.addMove({ id: 'from-output', state: 'WAITING', locationId: 'output', locationDestId: 'qc', procureMethod: 'MAKE_TO_ORDER', productUomQty: 5 });
    db.link('receipt', 'from-output');
    db.postLedger();

    await makePushApply(db.store)(['receipt'], { journal: memoryJournal() });

    expect(db.snapshot()).toMatchObject({
      moves: { receipt: { locationDestId: 'shelf', date: '2026-10-11T12:00:00.000Z' }, 'from-output': { procureMethod: 'MAKE_TO_STOCK' } },
      moveLinks: [],
      quants: [`shelf=5@${OPENING_IN_DATE}`],
    });
  });

  it('moves the done stock on, then makes the next step from where it went', async () => {
    const db = receiptsMovedOnThenChecked();
    const newId = pushedMoveId('receipt');

    await makePushApply(db.store)(['receipt'], { journal: memoryJournal() });

    expect(db.snapshot()).toMatchObject({
      moves: {
        receipt: { locationDestId: 'qc', date: '2026-10-11T12:00:00.000Z' },
        [newId]: { state: 'WAITING', locationId: 'qc', locationDestId: 'output', ruleId: 'check', date: '2026-10-11T12:00:00.000Z', productUomQty: 5 },
      },
      moveLinks: [`receipt>${newId}`],
      quants: [`qc=5@${QUANT_NOW}`, `stock=0@${OPENING_IN_DATE}`],
    });
  });

  it.each([
    ['a new step', () => receiptsIntoInput(MANY)],
    ['the done stock moved on', () => receiptsMovedOn(MANY)],
    ['the done stock moved on and stored in a bin', () => receiptsMovedOnIntoBin(MANY)],
    ['the done stock moved on, then a new step', () => receiptsMovedOnThenChecked(MANY)],
    ['the done stock moved on twice', () => receiptsMovedOnTwice(MANY)],
  ])('ends after a stop at any write as a clean run does, across chunks of moves (%s)', async (_name, setup) => {
    const clean = setup();
    await makePushApply(clean.store)(allReceipts(MANY), { journal: memoryJournal() });
    const expected = clean.snapshot();

    for (let stopAfter = 1; stopAfter <= clean.counter.writes; stopAfter += 1) {
      const db = setup();
      const progress = memoryJournal().progress;
      db.counter.stopAfter = stopAfter;

      await expect(makePushApply(db.store)(allReceipts(MANY), { journal: memoryJournal(false, progress) })).rejects.toThrow('stopped');
      db.counter.stopAfter = null;
      await makePushApply(db.store)(allReceipts(MANY), { journal: memoryJournal(true, progress) });

      expect({ stopAfter, snapshot: db.snapshot() }).toEqual({ stopAfter, snapshot: expected });
    }
  });

  it('finishes a stopped run once its new moves are written and confirmed, though their push rule was archived since', async () => {
    const clean = receiptsIntoInput();
    await makePushApply(clean.store)(['receipt-0'], { journal: memoryJournal() });
    const expected = clean.snapshot();

    const db = receiptsIntoInput();
    const progress = memoryJournal().progress;
    await makePushApply(db.store)(['receipt-0'], { journal: memoryJournal(false, progress) });
    // The stop came after the confirm, before the chunk was marked done.
    const chunk = progress.get('push:0');
    progress.set('push:0', { plan: chunk?.plan, done: false });
    db.routing.data = { ...db.routing.data, rules: db.routing.data.rules.filter((row) => row.id !== 'store') };

    await makePushApply(db.store)(['receipt-0'], { journal: memoryJournal(true, progress) });

    expect(db.snapshot()).toEqual(expected);
  });
});
