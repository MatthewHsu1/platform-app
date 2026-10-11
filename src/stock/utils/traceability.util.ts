import { LOCATION_USAGE, MOVE_STATE, PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';
import { type LotDeliveries } from 'src/stock/utils/types/lot-deliveries.type';
import { type TraceLine } from 'src/stock/utils/types/trace-line.type';
import { type TraceRecordLink } from 'src/stock/utils/types/trace-record-link.type';
import { type TraceRow } from 'src/stock/utils/types/trace-row.type';
import { type TraceabilityModel } from 'src/stock/utils/types/traceability-model.type';

// English source; the report view shows it translated.
export const INVENTORY_ADJUSTMENT_REFERENCE = 'Inventory Adjustment';

const isStockUsage = (usage: string) => usage === LOCATION_USAGE.INTERNAL || usage === LOCATION_USAGE.TRANSIT;

const link = (objectNameSingular: string, recordId: string | null): TraceRecordLink | null =>
  recordId === null ? null : { objectNameSingular, recordId };

// A line is named after its transfer, else as an inventory adjustment, else
// after the scrap that sent it to an inventory loss location.
const reference = (line: TraceLine): { name: string; record: TraceRecordLink | null } => {
  if (line.pickingName !== null) {
    return { name: line.pickingName, record: link('stockPicking', line.pickingId) };
  }
  if (line.isInventory) {
    return { name: INVENTORY_ADJUSTMENT_REFERENCE, record: link('stockMove', line.moveId) };
  }
  if (line.locationDestUsage === LOCATION_USAGE.INVENTORY && line.scrapName !== null) {
    return { name: line.scrapName, record: link('stockScrap', line.scrapId) };
  }
  return { name: '', record: null };
};

const usage = (line: TraceLine): TraceRow['usage'] => {
  if (line.locationUsage === LOCATION_USAGE.INTERNAL && line.locationDestUsage === LOCATION_USAGE.INTERNAL) {
    return 'internal';
  }
  return line.locationUsage !== LOCATION_USAGE.INTERNAL && line.locationDestUsage === LOCATION_USAGE.INTERNAL ? 'in' : 'out';
};

// A receipt shows the vendor instead of its source location, a delivery the
// customer instead of its destination. Only the line's own transfer counts:
// a line that has none shows its locations.
const fromTo = (line: TraceLine) => {
  const partner = { name: line.partnerName ?? '', record: line.partnerObject === null ? null : link(line.partnerObject, line.partnerId) };
  const source = { name: line.locationName, record: null };
  const destination = { name: line.locationDestName, record: null };
  const code = line.pickingIsOwn ? line.pickingTypeCode : null;

  if (code === PICKING_TYPE_CODE.INCOMING) {
    return [partner, destination];
  }
  return code === PICKING_TYPE_CODE.OUTGOING ? [source, partner] : [source, destination];
};

// The done lines of the same lot that fed this one: through the origin moves
// of a chained move, else the lines that brought the lot into this line's
// source location before it left.
const linesBefore = (current: TraceLine, doneLines: TraceLine[]) => {
  if (current.moveOrigIds.length > 0) {
    return doneLines.filter(
      (candidate) =>
        candidate.moveId !== null &&
        current.moveOrigIds.includes(candidate.moveId) &&
        candidate.lotId === current.lotId &&
        candidate.state === MOVE_STATE.DONE,
    );
  }
  if (isStockUsage(current.locationUsage)) {
    return doneLines.filter(
      (candidate) =>
        candidate.productId === current.productId &&
        candidate.lotId === current.lotId &&
        candidate.locationDestId === current.locationId &&
        candidate.date <= current.date &&
        candidate.state === MOVE_STATE.DONE,
    );
  }
  return [];
};

const walkBack = (start: TraceLine, doneLines: TraceLine[], allSteps: boolean) => {
  const seen = new Set([start.id]);
  const found: TraceLine[] = [];
  const todo = [start];

  while (todo.length > 0) {
    const current = todo.shift() as TraceLine;
    const next = linesBefore(current, doneLines).filter((candidate) => !seen.has(candidate.id));

    for (const candidate of next) {
      seen.add(candidate.id);
      found.push(candidate);
      if (allSteps) {
        todo.push(candidate);
      }
    }
  }

  return found;
};

// Every line upstream of this one, breadth first.
export const traceabilityUpstream = (start: TraceLine, doneLines: TraceLine[]) => walkBack(start, doneLines, true);

// The lines one step upstream: what unfolding a line shows. Each can unfold in turn.
export const traceabilityPrevious = (start: TraceLine, doneLines: TraceLine[]) => walkBack(start, doneLines, false);

export const traceabilityLines = ({
  model,
  startLines,
  doneLines,
  digits,
}: {
  model: TraceabilityModel;
  startLines: TraceLine[];
  doneLines: TraceLine[];
  digits: number;
}): TraceRow[] =>
  startLines
    .map((line, index) => ({ line, index }))
    .sort((left, right) =>
      left.line.moveDate === right.line.moveDate ? left.index - right.index : left.line.moveDate < right.line.moveDate ? 1 : -1,
    )
    .map(({ line }) => {
      const [from, to] = fromTo(line);
      const named = reference(line);

      return {
        lineId: line.id,
        reference: named.name,
        referenceRecord: named.record,
        productName: line.productName,
        date: line.moveDate,
        lotId: line.lotId,
        lotName: line.lotName,
        from: from.name,
        fromRecord: from.record,
        to: to.name,
        toRecord: to.record,
        quantity: `${line.quantityProductUom.toFixed(digits)} ${line.uomName}`,
        quantityValue: line.quantityProductUom,
        uomName: line.uomName,
        usage: usage(line),
        // Something lies upstream exactly when the first step back finds a line.
        unfoldable: model !== 'stockLot' && line.lotId !== null && traceabilityPrevious(line, doneLines).length > 0,
        pickingId: line.pickingId,
      };
    });

const byDateDoneNewestFirst = (left: TraceLine, right: TraceLine) => {
  const leftDate = left.pickingDateDone ?? '';
  const rightDate = right.pickingDateDone ?? '';

  return leftDate < rightDate ? 1 : leftDate > rightDate ? -1 : 0;
};

// The deliveries a lot left in, and their customers, the latest delivery's first.
export const findDeliveriesByLot = (lines: TraceLine[]): LotDeliveries => {
  const byPicking = new Map<string, TraceLine>();

  for (const line of lines) {
    if (line.state === MOVE_STATE.DONE && line.pickingTypeCode === PICKING_TYPE_CODE.OUTGOING && line.pickingId !== null && !byPicking.has(line.pickingId)) {
      byPicking.set(line.pickingId, line);
    }
  }
  const newestFirst = [...byPicking.values()].sort(byDateDoneNewestFirst);

  return {
    deliveryIds: [...byPicking.keys()],
    partnerIds: [...new Set(newestFirst.flatMap((line) => (line.partnerId === null ? [] : [line.partnerId])))],
  };
};
