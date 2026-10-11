import { type Records } from 'src/shared/triggers/records';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { type PrintRows } from 'src/stock/printing/types/print-rows.type';
import { filterReadableIds } from 'src/stock/stock-access';
import { findAs } from 'src/stock/stock-person-writes';
import { type RowFinder } from 'src/stock/types/row-finder.type';

// Records a row rule may hide, met inside another row (a transfer's contact, a line's lot): each
// one must be readable by the user too, or the print leaves it out.
const GUARDED_PLURALS: Record<string, string> = {
  person: 'people',
  company: 'companies',
  stockPicking: 'stockPickings',
  stockMove: 'stockMoves',
  stockMoveLine: 'stockMoveLines',
  stockLot: 'stockLots',
  stockPackage: 'stockPackages',
  stockPackageHistory: 'stockPackageHistories',
  stockQuant: 'stockQuants',
  stockPickingBatch: 'stockPickingBatches',
  stockScrap: 'stockScraps',
};

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row => typeof value === 'object' && value !== null && !Array.isArray(value);

const objectOf = (row: Row) =>
  typeof row.__typename === 'string' ? `${row.__typename.charAt(0).toLowerCase()}${row.__typename.slice(1)}` : null;

// Every nested record names its object, so it can be told apart from a composite value (a name,
// an address); the row's own id is always read.
const withTypenames = (selection: string) => `id ${selection.replace(/\{/g, '{ __typename ')}`;

const nestedRecords = (row: Row): { objectSingular: string; id: string }[] =>
  Object.values(row).flatMap((value) => {
    const values = Array.isArray(value) ? value : [value];

    return values.filter(isRow).flatMap((nested) => {
      const objectSingular = objectOf(nested);
      if (objectSingular === null || !(objectSingular in GUARDED_PLURALS)) {
        return nestedRecords(nested);
      }
      // Without its id the page could not tell the record was allowed and would print it blank.
      if (typeof nested.id !== 'string') {
        throw new Error(`A print read a ${objectSingular} inside another record without its id: add id to that selection.`);
      }
      const own = [{ objectSingular, id: nested.id }];

      return [...own, ...nestedRecords(nested)];
    });
  });

const add = (map: Map<string, Set<string>>, objectSingular: string, id: string) =>
  map.set(objectSingular, (map.get(objectSingular) ?? new Set()).add(id));

// Reads as the clicking user and notes every row read, and every guarded record met inside them.
// `rows()` then checks those inner records as the user and gives what the print may show.
export const recordingFinder = () => {
  const read = new Map<string, Set<string>>();
  const met = new Map<string, Set<string>>();
  const find: RowFinder = async <TRow>(objectSingular: string, objectPlural: string, filter: Row, selection: string) => {
    const rows = await findAs('person')<Row>(objectSingular, objectPlural, filter, withTypenames(selection));

    for (const row of rows) {
      add(read, objectSingular, String(row.id));
      nestedRecords(row).forEach((nested) => add(met, nested.objectSingular, nested.id));
    }

    return rows as TRow[];
  };
  const rows = async (): Promise<PrintRows> => {
    for (const [objectSingular, ids] of met) {
      const unread = [...ids].filter((id) => read.get(objectSingular)?.has(id) !== true);

      (await filterReadableIds(objectSingular, GUARDED_PLURALS[objectSingular], unread)).forEach((id) => add(read, objectSingular, id));
    }

    return Object.fromEntries([...read].map(([objectSingular, ids]) => [objectSingular, [...ids]]));
  };

  return { find, rows };
};

// A guarded record the user could not read is left out of the row it sits in.
const scrub = (row: Row, allowed: Map<string, Set<string>>): Row =>
  Object.fromEntries(
    Object.entries(row).map(([field, value]) => {
      const clean = (item: unknown): unknown => {
        if (!isRow(item)) {
          return item;
        }
        const objectSingular = objectOf(item);

        if (objectSingular !== null && objectSingular in GUARDED_PLURALS && !allowed.get(objectSingular)?.has(String(item.id))) {
          return null;
        }

        return scrub(item, allowed);
      };

      return [field, Array.isArray(value) ? value.map(clean).filter((item) => item !== null) : clean(value)];
    }),
  );

// Reads as the app for a print page, which has no user, and keeps only the rows the user could
// read when the print was asked for.
export const restrictedFinder = (rows: PrintRows): RowFinder => {
  const allowed = new Map(Object.entries(rows).map(([objectSingular, ids]) => [objectSingular, new Set(ids)]));

  return async <TRow>(objectSingular: string, objectPlural: string, filter: Row, selection: string) =>
    (await findAs('application')<Row>(objectSingular, objectPlural, filter, withTypenames(selection)))
      .filter((row) => allowed.get(objectSingular)?.has(String(row.id)) === true)
      .map((row) => scrub(row, allowed)) as TRow[];
};

// The rows of one object through a print's reader.
export const findIn = <TRow>(find: RowFinder, of: Records, filter: Row, selection: string) =>
  find<TRow>(of.objectSingular, of.objectPlural, filter, selection);

// The rows of these ids, in the order asked, each once; an id with no row is skipped.
export const findInOrder = async <TRow extends { id: string }>(find: RowFinder, of: Records, ids: string[], selection: string) => {
  const wanted = [...new Set(ids)];
  const byId = new Map(
    (await readInChunks(wanted, (part) => findIn<TRow>(find, of, { id: { in: part } }, selection))).map((row) => [row.id, row]),
  );

  return wanted.flatMap((id) => byId.get(id) ?? []);
};
