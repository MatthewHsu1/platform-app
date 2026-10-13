import { PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { compareAtDigits, convertQuantity, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type SetQuantityInput } from 'src/stock/utils/types/set-quantity-input.type';
import { type SetQuantityLine } from 'src/stock/utils/types/set-quantity-line.type';

type SetQuantityPlan = {
  update: { lineId: string; quantity: number }[];
  destroy: string[];
  create: { quantKey: string | null; locationId: string; ownerId: string | null; quantity: number; productUomId: string }[];
};

const newestFirst = (a: SetQuantityLine, b: SetQuantityLine) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

// The move quantity was typed: grow the lines towards it from stock (the lines' own keys first,
// then the source location in removal order, then one plain line, or one line per unit for a
// serial product), or shrink the newest lines.
export const planSetQuantity = (input: SetQuantityInput): SetQuantityPlan => {
  const { moveUomId, productUomId, uoms, digits } = input;
  const convert = (qty: number, fromUomId: string, toUomId: string, round = false) =>
    convertQuantity({ qty, fromUomId, toUomId, uoms, digits, round, method: 'HALF-UP' });
  const current = input.lines.reduce((sum, line) => sum + convert(line.quantity, line.productUomId, moveUomId), 0);
  const plan: SetQuantityPlan = { update: [], destroy: [], create: [] };
  const delta = input.target - current;

  if (compareAtDigits(delta, 0, digits) === 0) {
    return plan;
  }

  if (delta < 0) {
    let toRemove = -delta;

    for (const line of [...input.lines].sort(newestFirst)) {
      if (isZeroAtDigits(toRemove, digits)) {
        break;
      }
      const decrease = Math.min(line.quantity, convert(toRemove, moveUomId, line.productUomId));

      if (isZeroAtDigits(decrease, digits)) {
        continue;
      }
      if (compareAtDigits(line.quantity, decrease, digits) === 0) {
        plan.destroy.push(line.id);
      } else {
        plan.update.push({ lineId: line.id, quantity: line.quantity - decrease });
      }
      toRemove -= convert(decrease, line.productUomId, moveUomId);
    }
    return plan;
  }

  let remaining = convert(input.target, moveUomId, productUomId);
  const consumed = new Set<string>();
  const remainingInMoveUnit = () => convert(remaining, productUomId, moveUomId);

  for (const line of input.lines) {
    const lineQuantity = convert(line.quantity, line.productUomId, productUomId);

    if (lineQuantity < 0) {
      continue;
    }
    if (isZeroAtDigits(remainingInMoveUnit(), digits)) {
      plan.destroy.push(line.id);
      continue;
    }
    if (compareAtDigits(lineQuantity, remaining, digits) > 0) {
      plan.update.push({ lineId: line.id, quantity: convert(remaining, productUomId, line.productUomId) });
      remaining = 0;
      continue;
    }
    remaining -= lineQuantity;
    if (compareAtDigits(remainingInMoveUnit(), 0, digits) <= 0 || input.bypassReservation) {
      continue;
    }
    const grow = Math.min(Math.max(0, input.freeByKey.get(line.key) ?? 0), remaining);
    consumed.add(line.key);

    if (grow > 0) {
      remaining -= grow;
      plan.update.push({ lineId: line.id, quantity: convert(lineQuantity + grow, productUomId, line.productUomId) });
    }
  }

  if (compareAtDigits(remainingInMoveUnit(), 0, digits) > 0 && !input.bypassReservation) {
    for (const quant of input.quants) {
      if (consumed.has(quant.key) || quant.free <= 0) {
        continue;
      }
      const taken = Math.min(remaining, quant.free);
      const inMoveUnit = convert(taken, productUomId, moveUomId, true);
      const backInProductUnit = convert(inMoveUnit, moveUomId, productUomId, true);
      const keepsMoveUnit = compareAtDigits(backInProductUnit, taken, digits) === 0;

      remaining -= taken;
      plan.create.push({
        quantKey: quant.key,
        locationId: quant.locationId,
        ownerId: quant.ownerId,
        quantity: keepsMoveUnit ? inMoveUnit : taken,
        productUomId: keepsMoveUnit ? moveUomId : productUomId,
      });
      if (compareAtDigits(remainingInMoveUnit(), 0, digits) <= 0) {
        break;
      }
    }
  }

  if (compareAtDigits(remainingInMoveUnit(), 0, digits) > 0) {
    if (input.tracking === PRODUCT_TRACKING.SERIAL) {
      const units = Math.floor(remaining + 10 ** -digits / 2);

      for (let unit = 0; unit < units; unit += 1) {
        plan.create.push({ quantKey: null, locationId: input.moveLocationId, ownerId: null, quantity: 1, productUomId });
      }
    } else {
      plan.create.push({
        quantKey: null,
        locationId: input.moveLocationId,
        ownerId: null,
        quantity: remainingInMoveUnit(),
        productUomId: moveUomId,
      });
    }
  }

  return plan;
};
