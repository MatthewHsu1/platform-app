import { formatSequenceNumber } from 'src/base/sequence/next-number';
import {
  generateLotNames,
  generateLotQuantities,
  LOT_QUANTITY_NOT_POSITIVE,
} from 'src/stock/utils/generate-lot-names.util';
import { splitLotText } from 'src/stock/utils/split-lot-text.util';
import { type PlanLotLinesInput } from 'src/stock/utils/types/plan-lot-lines-input.type';
import { type PlanLotLinesResult } from 'src/stock/utils/types/plan-lot-lines-result.type';
import { type PlannedLotLine } from 'src/stock/utils/types/planned-lot-line.type';

export const NO_PRODUCT_TO_GENERATE = 'No product found to generate Serials/Lots for.';

export const SERIAL_COUNT_NOT_POSITIVE = 'The number of Serial Numbers to generate must be greater than zero.';

const DAY_MS = 86_400_000;

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

// A first name equal to the sequence's last value (the user just took it) or
// its next one makes the sequence jump past the generated names, so the next
// lot it numbers does not repeat one. Null when the sequence keeps its value.
const sequenceAfter = (input: PlanLotLinesInput, generatedCount: number) => {
  const { sequence, firstLot } = input;

  if (sequence === null || firstLot.length === 0) {
    return null;
  }
  const lastTaken = sequence.numberNext - sequence.numberIncrement;
  let final = lastTaken;

  if (firstLot === formatSequenceNumber(sequence.prefix, sequence.padding, lastTaken)) {
    final = lastTaken + generatedCount;
  } else if (firstLot === formatSequenceNumber(sequence.prefix, sequence.padding, sequence.numberNext)) {
    final = sequence.numberNext + generatedCount;
  }

  return final === lastTaken || final === sequence.numberNext ? null : final;
};

const generatedLines = (input: PlanLotLinesInput): PlannedLotLine[] | { refuse: string } => {
  let quantities: number[];

  if (input.tracking === 'LOT') {
    const lots = generateLotQuantities(Math.max(0, input.quantityReceived), input.count);

    if (lots === null) {
      return { refuse: LOT_QUANTITY_NOT_POSITIVE };
    }
    quantities = lots;
  } else {
    const count = Math.floor(input.count);

    if (!(count > 0)) {
      return { refuse: SERIAL_COUNT_NOT_POSITIVE };
    }
    quantities = Array.from({ length: count }, () => 1);
  }
  const names = generateLotNames(input.firstLot, quantities.length);

  return names.map((lotName, index) => ({ lotName, quantity: quantities[index], expirationDate: null }));
};

export const planLotLines = (input: PlanLotLinesInput): PlanLotLinesResult => {
  if (!input.productFound) {
    return { kind: 'refuse', reason: NO_PRODUCT_TO_GENERATE };
  }

  let lines: PlannedLotLine[];

  if (input.mode === 'GENERATE') {
    const generated = generatedLines(input);

    if (!Array.isArray(generated)) {
      return { kind: 'refuse', reason: generated.refuse };
    }
    lines = generated;
  } else {
    // A pasted row without a quantity, or with 0, holds one unit.
    lines = splitLotText({
      text: input.text,
      useExpirationDate: input.useExpirationDate,
      dateOrder: input.dateOrder,
      today: input.today,
    }).map((line) => ({ ...line, quantity: line.quantity === 0 ? 1 : line.quantity }));
  }

  if (input.useExpirationDate) {
    const from = input.scheduledDate === null ? startOfUtcDay(input.today) : new Date(input.scheduledDate);
    const defaultDate = new Date(from.getTime() + input.expirationTime * DAY_MS).toISOString();

    lines = lines.map((line) => ({ ...line, expirationDate: line.expirationDate ?? defaultDate }));
  }

  return {
    kind: 'lines',
    lines,
    sequenceNumberNext: input.mode === 'GENERATE' ? sequenceAfter(input, lines.length) : null,
  };
};
