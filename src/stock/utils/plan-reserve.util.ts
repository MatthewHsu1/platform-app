import { keepFreshForReservation } from 'src/product-expiry/utils/expiry-quantities.util';
import { floatRound, type RoundingMethod } from 'src/shared/utils/float-round.util';
import { quantKey } from 'src/stock/quant/quant-key';
import { pickRemovalStrategy, planLeastPackages, removalOrder } from 'src/stock/removal/removal-order';
import { REMOVAL_METHOD } from 'src/stock/routing-options.constant';
import { MOVE_STATE, PACKAGING_RESERVE_METHOD, PROCURE_METHOD, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { isLocationUnder } from 'src/stock/utils/location-usage.util';
import { compareAtDigits, convertQuantity, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { checkQty } from 'src/uom/utils/uom.util';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type OriginAvailability } from 'src/stock/utils/types/origin-availability.type';
import { type ReserveMove } from 'src/stock/utils/types/reserve-move.type';
import { type ReserveProduct } from 'src/stock/utils/types/reserve-product.type';
import { type ReserveQuant } from 'src/stock/utils/types/reserve-quant.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';
import { type ReserveLine } from 'src/stock/utils/types/reserve-line.type';

type NewReserveLine = {
  moveId: string;
  productId: string;
  pickingId: string | null;
  locationId: string;
  locationDestId: string | null;
  ownerId: string | null;
  productUomId: string;
  quantity: number;
  quantityProductUom: number;
  lotId?: string;
  packageId?: string;
};

type ReservePlan = {
  creates: NewReserveLine[];
  grows: { lineId: string; quantity: number; quantityProductUom: number }[];
  assigned: string[];
  partiallyAvailable: string[];
  touchedKeys: string[];
};

const RESERVABLE_STATES: MoveState[] = [MOVE_STATE.CONFIRMED, MOVE_STATE.WAITING, MOVE_STATE.PARTIALLY_AVAILABLE];

type Slot = { lotId: string | null; packageId: string | null };

const NO_SLOT: Slot = { lotId: null, packageId: null };

type KeyParts = Slot & { locationId: string | null; ownerId: string | null };

type KeyLine = {
  locationId: string | null;
  lotId?: string | null;
  packageId?: string | null;
  ownerId: string | null;
  quantityProductUom: number;
};

const partsOf = (line: KeyLine): KeyParts => ({
  locationId: line.locationId,
  lotId: line.lotId ?? null,
  packageId: line.packageId ?? null,
  ownerId: line.ownerId,
});

const placeKey = (parts: KeyParts) => [parts.locationId ?? '', parts.lotId ?? '', parts.packageId ?? '', parts.ownerId ?? ''].join('|');

const sumByPlace = (lines: KeyLine[]) => {
  const sums = new Map<string, { parts: KeyParts; quantity: number }>();
  for (const line of lines) {
    const parts = partsOf(line);
    const key = placeKey(parts);
    const entry = sums.get(key) ?? { parts, quantity: 0 };
    entry.quantity += line.quantityProductUom;
    sums.set(key, entry);
  }
  return sums;
};

const slotOf = (entry: OriginAvailability): Slot => ({ lotId: entry.lotId ?? null, packageId: entry.packageId ?? null });

const originEntryKey = (entry: OriginAvailability) => placeKey({ ...slotOf(entry), locationId: entry.locationId, ownerId: entry.ownerId });

// What the original lines brought is kept apart per location, lot, package and owner: a move fed by
// them reserves exactly those stock rows.
export const planOriginAvailability = ({
  linesIn,
  siblingDoneLines,
  siblingReservedLines,
  ownLines,
  digits,
}: {
  linesIn: {
    locationDestId: string | null;
    lotId?: string | null;
    resultPackageId?: string | null;
    ownerId: string | null;
    quantityProductUom: number;
  }[];
  siblingDoneLines: KeyLine[];
  siblingReservedLines: KeyLine[];
  ownLines: KeyLine[];
  digits: number;
}): OriginAvailability[] => {
  const incoming = sumByPlace(
    linesIn.map((line) => ({
      locationId: line.locationDestId,
      lotId: line.lotId,
      packageId: line.resultPackageId,
      ownerId: line.ownerId,
      quantityProductUom: line.quantityProductUom,
    })),
  );
  const outgoing = new Map([...sumByPlace(siblingDoneLines)].map(([key, entry]) => [key, entry.quantity]));

  // What reserved siblings hold replaces their done lines on the same key.
  for (const [key, entry] of sumByPlace(siblingReservedLines)) {
    outgoing.set(key, entry.quantity);
  }

  const available = new Map(
    [...incoming].map(([key, entry]) => [key, { parts: entry.parts, quantity: entry.quantity - (outgoing.get(key) ?? 0) }]),
  );

  for (const line of ownLines) {
    const entry = available.get(placeKey(partsOf(line)));
    if (!isZeroAtDigits(line.quantityProductUom, digits) && entry !== undefined) {
      entry.quantity -= line.quantityProductUom;
    }
  }

  return [...available.values()].flatMap(({ parts, quantity }) =>
    compareAtDigits(quantity, 0, digits) > 0 && parts.locationId !== null && parts.locationId !== ''
      ? [
          {
            locationId: parts.locationId,
            ...(parts.lotId === null ? {} : { lotId: parts.lotId }),
            ...(parts.packageId === null ? {} : { packageId: parts.packageId }),
            ownerId: parts.ownerId,
            quantity,
          },
        ]
      : [],
  );
};

type Context = {
  stock: ReserveQuant[];
  products: Map<string, ReserveProduct>;
  uoms: Map<string, ResolvedUom>;
  digits: number;
  plan: ReservePlan;
  grows: Map<string, { lineId: string; quantity: number; quantityProductUom: number }>;
  touched: Set<string>;
  pools: Map<string, number>;
  seenPools: Set<string>;
};

const convert = (context: Context, qty: number, fromUomId: string, toUomId: string, method: RoundingMethod) =>
  convertQuantity({ qty, fromUomId, toUomId, uoms: context.uoms, digits: context.digits, method });

const roundQuantity = (context: Context, value: number) => floatRound(value, 10 ** -context.digits, 'HALF-UP');

// The line counts in the move's unit when the quantity converts there and
// back exactly; else in the product's unit.
const lineQuantity = (context: Context, quantityInProductUnit: number, move: ReserveMove, product: ReserveProduct) => {
  const inMoveUnit = convert(context, quantityInProductUnit, product.uomId, move.productUomId, 'HALF-UP');
  const back = convert(context, inMoveUnit, move.productUomId, product.uomId, 'HALF-UP');

  return compareAtDigits(quantityInProductUnit, back, context.digits) === 0
    ? { quantity: inMoveUnit, productUomId: move.productUomId }
    : { quantity: quantityInProductUnit, productUomId: product.uomId };
};

const addLine = (
  context: Context,
  move: ReserveMove,
  product: ReserveProduct,
  quantityInProductUnit: number,
  locationId: string,
  ownerId: string | null,
  slot: Slot = NO_SLOT,
) => {
  context.plan.creates.push({
    moveId: move.id,
    productId: move.productId,
    pickingId: move.pickingId,
    locationId,
    locationDestId: move.locationDestId,
    ownerId,
    ...lineQuantity(context, quantityInProductUnit, move, product),
    quantityProductUom: roundQuantity(context, quantityInProductUnit),
    ...(slot.lotId === null ? {} : { lotId: slot.lotId }),
    ...(slot.packageId === null ? {} : { packageId: slot.packageId }),
  });
};

const growLine = (context: Context, line: ReserveLine, inLineUnit: number, inProductUnit: number) => {
  line.quantity = roundQuantity(context, line.quantity + inLineUnit);
  line.quantityProductUom = roundQuantity(context, line.quantityProductUom + inProductUnit);
  context.grows.set(line.id, { lineId: line.id, quantity: line.quantity, quantityProductUom: line.quantityProductUom });
};

// A reservation on a key the move already holds grows that line, unless the
// quantity does not convert exactly into the line's unit. Serial lines never
// grow: each one holds one serial number.
const placeReservedLine = (
  context: Context,
  move: ReserveMove,
  product: ReserveProduct,
  lines: ReserveLine[],
  quantityInProductUnit: number,
  locationId: string,
  ownerId: string | null,
  slot: Slot = NO_SLOT,
) => {
  const candidate =
    product.tracking === PRODUCT_TRACKING.SERIAL
      ? undefined
      : lines.find(
          (line) =>
            line.locationId === locationId &&
            line.ownerId === ownerId &&
            (line.lotId ?? null) === slot.lotId &&
            (line.packageId ?? null) === slot.packageId,
        );

  if (candidate !== undefined && candidate.productUomId !== null) {
    const inLineUnit = convert(context, quantityInProductUnit, product.uomId, candidate.productUomId, 'HALF-UP');
    const back = convert(context, inLineUnit, candidate.productUomId, product.uomId, 'HALF-UP');

    if (compareAtDigits(quantityInProductUnit, back, context.digits) === 0) {
      growLine(context, candidate, inLineUnit, quantityInProductUnit);
      return;
    }
  }
  addLine(context, move, product, quantityInProductUnit, locationId, ownerId, slot);
};

const touch = (context: Context, move: ReserveMove, locationId: string, ownerId: string | null, slot: Slot = NO_SLOT) =>
  context.touched.add(quantKey({ productId: move.productId, locationId, lotId: slot.lotId, packageId: slot.packageId, ownerId }));

const splitsIntoUnits = (move: ReserveMove, product: ReserveProduct) =>
  product.tracking === PRODUCT_TRACKING.SERIAL && move.usesLots === true;

const wholeUnits = (context: Context, quantity: number) => Math.floor(quantity + 10 ** -context.digits / 2);

// A serial product reserved for an operation type that uses lots gets one line per whole unit, so each
// line can take one serial number.
const placeTaken = (
  context: Context,
  move: ReserveMove,
  product: ReserveProduct,
  lines: ReserveLine[],
  quantityInProductUnit: number,
  locationId: string,
  ownerId: string | null,
  slot: Slot,
) => {
  if (!splitsIntoUnits(move, product)) {
    placeReservedLine(context, move, product, lines, quantityInProductUnit, locationId, ownerId, slot);
    return;
  }
  for (let unit = 0; unit < wholeUnits(context, quantityInProductUnit); unit += 1) {
    addLine(context, move, product, 1, locationId, ownerId, slot);
  }
};

// A serial product is reserved in whole units only: a quantity with a fraction reserves nothing.
const serialWhole = (context: Context, product: ReserveProduct, quantity: number) =>
  product.tracking === PRODUCT_TRACKING.SERIAL && compareAtDigits(quantity, Math.trunc(quantity), context.digits) !== 0
    ? 0
    : quantity;

const poolEntries = (context: Context, move: ReserveMove) => {
  const poolKey = move.originPoolKey ?? '';

  if (!context.seenPools.has(poolKey)) {
    context.seenPools.add(poolKey);
    for (const entry of move.originAvailable) {
      context.pools.set(`${poolKey}|${originEntryKey(entry)}`, entry.quantity);
    }
  }

  return move.originAvailable.map((entry) => ({
    ...entry,
    poolEntryKey: `${poolKey}|${originEntryKey(entry)}`,
    quantity: context.pools.get(`${poolKey}|${originEntryKey(entry)}`) ?? 0,
  }));
};

const reserveBypass = (
  context: Context,
  move: ReserveMove,
  product: ReserveProduct,
  lines: ReserveLine[],
  missingInProductUnit: number,
) => {
  let remaining = missingInProductUnit;

  if (move.originPoolKey !== null) {
    for (const entry of poolEntries(context, move)) {
      const added = Math.min(remaining, entry.quantity);
      if (compareAtDigits(added, 0, context.digits) <= 0) {
        continue;
      }
      addLine(context, move, product, added, entry.locationId, entry.ownerId, slotOf(entry));
      context.pools.set(entry.poolEntryKey, entry.quantity - added);
      remaining -= added;
      if (isZeroAtDigits(remaining, context.digits)) {
        break;
      }
    }
  }

  if (compareAtDigits(remaining, 0, context.digits) <= 0) {
    return;
  }
  if (splitsIntoUnits(move, product)) {
    placeTaken(context, move, product, lines, remaining, move.locationId, null, NO_SLOT);
    return;
  }

  const plain = lines.find(
    (line) =>
      line.productUomId === move.productUomId &&
      line.locationId === move.locationId &&
      line.locationDestId === move.locationDestId &&
      line.pickingId === move.pickingId &&
      !line.picked &&
      (line.lotId ?? null) === null &&
      (line.packageId ?? null) === null &&
      line.ownerId === null,
  );

  if (plain !== undefined) {
    growLine(context, plain, convert(context, remaining, product.uomId, move.productUomId, 'HALF-UP'), remaining);
  } else {
    addLine(context, move, product, remaining, move.locationId, null);
  }
};

// Free stock across the gathered rows, never below zero. For a tracked product each lot (and the stock
// without a lot) counts on its own, so a lot driven below zero does not hide another lot's stock.
const freeToReserve = (context: Context, product: ReserveProduct, gathered: ReserveQuant[]) => {
  const tracked = product.tracking !== undefined && product.tracking !== PRODUCT_TRACKING.NONE;
  const freeByLot = new Map<string, number>();

  for (const quant of gathered) {
    const lot = tracked ? (quant.lotId ?? '') : '';
    freeByLot.set(lot, (freeByLot.get(lot) ?? 0) + quant.quantity - quant.reservedQuantity);
  }

  return [...freeByLot.values()].reduce((sum, free) => (compareAtDigits(free, 0, context.digits) > 0 ? sum + free : sum), 0);
};

// The stock rows this move may take (the same objects, so what one move takes is gone for the next).
const stockFor = (context: Context, move: ReserveMove, product: ReserveProduct) =>
  move.date
    ? keepFreshForReservation({
        quants: context.stock,
        useExpirationDate: product.useExpirationDate === true,
        moveDate: move.date,
      })
    : context.stock;

const reserveFromStock = (
  context: Context,
  move: ReserveMove,
  product: ReserveProduct,
  lines: ReserveLine[],
  need: number,
) => {
  const method = pickRemovalStrategy(product.categoryRemovalMethod ?? null, move.removalMethodChain ?? []);
  const candidates = stockFor(context, move, product).filter(
    (quant) => quant.productId === move.productId && isLocationUnder(quant.locationParentPath, move.locationParentPath),
  );
  const gathered = removalOrder(
    method === REMOVAL_METHOD.LEAST_PACKAGES ? planLeastPackages(candidates, need) : candidates,
    method,
  );
  let available = freeToReserve(context, product, gathered);

  const productUom = context.uoms.get(product.uomId);
  const packagingUom = move.packagingUomId === null ? undefined : context.uoms.get(move.packagingUomId);

  if (product.packagingReserveMethod === PACKAGING_RESERVE_METHOD.FULL && productUom !== undefined && packagingUom !== undefined) {
    available = checkQty({ qty: Math.min(need, available), productUom, packagingUom, digits: context.digits, method: 'DOWN' });
  }

  let quantity = Math.min(need, available);

  // Never reserve less than one unit of the move's own unit can count.
  if (move.productUomId !== product.uomId) {
    const inMoveUnit = convert(context, quantity, product.uomId, move.productUomId, 'DOWN');
    quantity = convert(context, inMoveUnit, move.productUomId, product.uomId, 'HALF-UP');
  }
  quantity = serialWhole(context, product, quantity);

  if (compareAtDigits(quantity, 0, context.digits) <= 0) {
    return 0;
  }

  const takenByKey = new Map<string, { locationId: string; ownerId: string | null; slot: Slot; quantity: number }>();
  let remaining = quantity;

  for (const quant of gathered) {
    const free = quant.quantity - quant.reservedQuantity;
    if (compareAtDigits(free, 0, context.digits) <= 0) {
      continue;
    }
    const take = Math.min(free, remaining);
    quant.reservedQuantity += take;
    remaining -= take;
    const slot = { lotId: quant.lotId, packageId: quant.packageId };
    const key = quantKey({ productId: move.productId, locationId: quant.locationId, ...slot, ownerId: quant.ownerId });
    const entry = takenByKey.get(key) ?? { locationId: quant.locationId, ownerId: quant.ownerId, slot, quantity: 0 };
    entry.quantity += take;
    takenByKey.set(key, entry);
    if (isZeroAtDigits(remaining, context.digits)) {
      break;
    }
  }

  for (const entry of takenByKey.values()) {
    placeTaken(context, move, product, lines, entry.quantity, entry.locationId, entry.ownerId, entry.slot);
    touch(context, move, entry.locationId, entry.ownerId, entry.slot);
  }

  return quantity - remaining;
};

// Fed by original moves: take only what their done lines put in the source,
// key by key, and only what is still free on that exact stock row. Removal
// dates are not checked here: the earlier step already chose this stock.
const reserveFromOrigins = (
  context: Context,
  move: ReserveMove,
  product: ReserveProduct,
  lines: ReserveLine[],
): 'assigned' | 'partial' | null => {
  const productQty = convert(context, move.productUomQty, move.productUomId, product.uomId, 'HALF-UP');
  const productUom = context.uoms.get(product.uomId);
  const packagingUom = move.packagingUomId === null ? undefined : context.uoms.get(move.packagingUomId);
  const alreadyReserved = lines.reduce((sum, line) => sum + line.quantityProductUom, 0);
  let takenSoFar = 0;
  let outcome: 'assigned' | 'partial' | null = null;

  for (const entry of poolEntries(context, move)) {
    const need = productQty - alreadyReserved - takenSoFar;
    const ask = Math.min(entry.quantity, need);
    const slot = slotOf(entry);
    const quant = context.stock.find(
      (candidate) =>
        candidate.productId === move.productId &&
        candidate.locationId === entry.locationId &&
        candidate.lotId === slot.lotId &&
        candidate.packageId === slot.packageId &&
        candidate.ownerId === entry.ownerId,
    );
    const free = quant === undefined ? 0 : Math.max(0, quant.quantity - quant.reservedQuantity);
    let taken = compareAtDigits(ask, 0, context.digits) > 0 ? Math.min(ask, free) : 0;

    if (packagingUom !== undefined && productUom !== undefined && product.packagingReserveMethod === PACKAGING_RESERVE_METHOD.FULL) {
      taken = checkQty({ qty: taken, productUom, packagingUom, digits: context.digits, method: 'DOWN' });
    }
    taken = serialWhole(context, product, taken);

    if (quant === undefined || isZeroAtDigits(taken, context.digits)) {
      continue;
    }
    quant.reservedQuantity += taken;
    context.pools.set(entry.poolEntryKey, entry.quantity - taken);
    placeTaken(context, move, product, lines, taken, entry.locationId, entry.ownerId, slot);
    touch(context, move, entry.locationId, entry.ownerId, slot);
    takenSoFar += taken;

    if (isZeroAtDigits(need - taken, context.digits)) {
      outcome = 'assigned';
      break;
    }
    outcome = 'partial';
  }

  return outcome;
};

// Moves are reserved in the order given; each one sees the stock the
// earlier ones took.
export const planReserve = ({
  moves,
  quants,
  products,
  uoms,
  digits,
}: {
  moves: ReserveMove[];
  quants: ReserveQuant[];
  products: Map<string, ReserveProduct>;
  uoms: Map<string, ResolvedUom>;
  digits: number;
}): ReservePlan => {
  const context: Context = {
    stock: quants.map((quant) => ({ ...quant })),
    products,
    uoms,
    digits,
    plan: { creates: [], grows: [], assigned: [], partiallyAvailable: [], touchedKeys: [] },
    grows: new Map(),
    touched: new Set(),
    pools: new Map(),
    seenPools: new Set(),
  };

  for (const move of moves) {
    const product = products.get(move.productId);

    if (move.picked || !RESERVABLE_STATES.includes(move.state) || product === undefined) {
      continue;
    }

    const missing = move.productUomQty - move.quantity;

    if (compareAtDigits(missing, 0, digits) <= 0) {
      context.plan.assigned.push(move.id);
      continue;
    }

    const missingInProductUnit = convert(context, missing, move.productUomId, product.uomId, 'HALF-UP');
    const lines = move.lines.map((line) => ({ ...line }));

    if (move.bypass) {
      reserveBypass(context, move, product, lines, missingInProductUnit);
      context.plan.assigned.push(move.id);
      continue;
    }

    if (isZeroAtDigits(move.productUomQty, digits)) {
      context.plan.assigned.push(move.id);
      continue;
    }

    if (move.originPoolKey === null) {
      if (move.procureMethod === PROCURE_METHOD.MAKE_TO_ORDER) {
        continue;
      }
      const taken = reserveFromStock(context, move, product, lines, missingInProductUnit);
      if (isZeroAtDigits(taken, digits)) {
        continue;
      }
      if (compareAtDigits(missingInProductUnit, taken, digits) === 0) {
        context.plan.assigned.push(move.id);
      } else {
        context.plan.partiallyAvailable.push(move.id);
      }
      continue;
    }

    const outcome = reserveFromOrigins(context, move, product, lines);
    if (outcome === 'assigned') {
      context.plan.assigned.push(move.id);
    } else if (outcome === 'partial') {
      context.plan.partiallyAvailable.push(move.id);
    }
  }

  context.plan.grows = [...context.grows.values()];
  context.plan.touchedKeys = [...context.touched];

  return context.plan;
};
