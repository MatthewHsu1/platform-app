import { guessDateOrder, parseLotDate } from 'src/stock/utils/parse-lot-date.util';
import { type DateOrder } from 'src/stock/utils/types/date-order.type';
import { type ImportedLotLine } from 'src/stock/utils/types/imported-lot-line.type';

type ExtraColumn =
  | { kind: 'quantity'; quantity: number }
  | { kind: 'date'; date: string }
  | { kind: 'ignore' };

const QUANTITY = /^([0-9]+\.?[0-9]*|\.[0-9]+)$/;

const readExtraColumn = (
  text: string,
  order: DateOrder,
  useExpirationDate: boolean,
  today: Date,
): ExtraColumn | null => {
  const asNumber = text.replace(/,/g, '.');

  if (QUANTITY.test(asNumber)) {
    return { kind: 'quantity', quantity: Number.parseFloat(asNumber) };
  }
  const date = parseLotDate(text, order, today);

  if (date === null) {
    return null;
  }
  return useExpirationDate ? { kind: 'date', date } : { kind: 'ignore' };
};

// A column that is neither a number nor a date stops the reading: rather than
// guess, the lot name stays the whole row, or the first column once an
// earlier column was read.
export const splitLotText = ({
  text,
  useExpirationDate,
  dateOrder,
  today,
}: {
  text: string;
  useExpirationDate: boolean;
  dateOrder: DateOrder;
  today: Date;
}): ImportedLotLine[] => {
  let guessedOrder: DateOrder | null = null;

  return text
    .split('\n')
    .filter((row) => row.length > 0)
    .map((row) => {
      const line: ImportedLotLine = { lotName: row, quantity: 1, expirationDate: null };
      const columns = row.replace(/;/g, '\t').split('\t');
      let name = row;

      guessedOrder = guessedOrder ?? guessDateOrder(columns.slice(1), dateOrder);

      for (const column of columns.slice(1)) {
        const value = readExtraColumn(
          column,
          guessedOrder ?? 'MONTH_FIRST',
          useExpirationDate,
          today,
        );

        if (value === null) {
          line.lotName = name;
          break;
        }
        name = columns[0];
        line.lotName = name;

        if (value.kind === 'quantity') {
          line.quantity = value.quantity;
        } else if (value.kind === 'date') {
          line.expirationDate = value.date;
        }
      }

      return line;
    });
};
