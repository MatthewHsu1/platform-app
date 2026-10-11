import { addMonths } from 'src/stock/orderpoint/utils/day.util';
import { LOCATION_USAGE, MOVE_STATE } from 'src/stock/stock-options.constant';
import { addDays } from 'src/stock/utils/stock-dates.util';
import { type StockQuantityDay } from 'src/stock/utils/types/stock-quantity-day.type';
import { type StockQuantitySeriesInput } from 'src/stock/utils/types/stock-quantity-series-input.type';

const STOCK_USAGES = new Set<string>([LOCATION_USAGE.INTERNAL, LOCATION_USAGE.TRANSIT]);

// Per day of the window around today: the warehouse's forecast stock, and the
// receipts and deliveries still planned for that day.
export const stockQuantitySeries = ({
  warehouseId,
  moves,
  quants,
  warehouseOfLocation,
  usageOfLocation,
  today,
  months = 3,
  from,
  to,
}: StockQuantitySeriesInput): StockQuantityDay[] => {
  const windowStart = addMonths(today, -months);
  const windowEnd = addMonths(today, months);
  const firstDay = from !== undefined && from > windowStart ? from : windowStart;
  const lastDay = to !== undefined && to < windowEnd ? to : windowEnd;
  const days: StockQuantityDay[] = [];

  for (let date = firstDay; date <= lastDay; date = addDays(date, 1)) {
    days.push({ date, forecast: 0, incoming: 0, outgoing: 0 });
  }
  const indexOf = new Map(days.map((row, index) => [row.date, index]));
  const addRange = (start: string, end: string, quantity: number) => {
    for (const row of days) {
      if (row.date >= start && row.date <= end) {
        row.forecast += quantity;
      }
    }
  };
  const warehouseOf = (locationId: string) => warehouseOfLocation.get(locationId) ?? null;

  for (const quant of quants) {
    const usage = usageOfLocation.get(quant.locationId);

    if (usage === undefined || !STOCK_USAGES.has(usage) || warehouseOf(quant.locationId) !== warehouseId) {
      continue;
    }
    const removalDay = quant.removalDate ? quant.removalDate.slice(0, 10) : null;

    // Stock due for removal stops counting from today, except what is already
    // reserved for a move.
    if (removalDay !== null && removalDay <= today) {
      addRange(firstDay, addDays(today, -1), quant.quantity);
      addRange(today, lastDay, quant.reservedQuantity);
    } else {
      addRange(firstDay, lastDay, quant.quantity);
    }
  }

  for (const move of moves) {
    if (move.state === MOVE_STATE.DRAFT || move.state === MOVE_STATE.CANCEL) {
      continue;
    }
    if (move.productQty === 0 && move.quantityProductUom === 0) {
      continue;
    }
    const moveDay = move.date.slice(0, 10);
    const isDone = move.state === MOVE_STATE.DONE;

    if (isDone && moveDay < windowStart) {
      continue;
    }
    // An open move counts toward where its chain ends; a done one toward where it went.
    const sourceWarehouse = warehouseOf(move.locationId);
    const destinationWarehouse = warehouseOf(
      isDone ? move.locationDestId : (move.locationFinalId ?? move.locationDestId),
    );

    // Moves inside one warehouse, or outside every warehouse, change nothing.
    if (sourceWarehouse === destinationWarehouse) {
      continue;
    }
    const direction = sourceWarehouse === warehouseId ? -1 : destinationWarehouse === warehouseId ? 1 : 0;

    if (direction === 0) {
      continue;
    }
    if (!isDone && move.productQty !== 0) {
      const index = indexOf.get(moveDay);

      if (index !== undefined) {
        if (direction === 1) {
          days[index].incoming += move.productQty;
        } else {
          days[index].outgoing -= move.productQty;
        }
      }
      addRange(moveDay > windowStart ? moveDay : windowStart, windowEnd, direction * move.productQty);
    }
    // A done move is already in today's stock: undo it on the days before it.
    if (isDone && move.quantityProductUom !== 0) {
      addRange(windowStart, addDays(moveDay, -1), -direction * move.quantityProductUom);
    }
  }

  return days;
};
