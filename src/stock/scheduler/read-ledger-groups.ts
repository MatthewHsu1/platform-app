import { type LedgerDimension } from 'src/stock/scheduler/types/ledger-dimension.type';
import { type LedgerGroupQuery } from 'src/stock/scheduler/types/ledger-group-query.type';

const KEY_DIMENSIONS: LedgerDimension[] = ['product', 'location', 'owner', 'lot', 'package'];
// Lot or package ids asked for in one filter.
const ID_CHUNK = 200;

type Condition = { dimension: LedgerDimension; values: (string | null)[]; exclude?: boolean };
type Group = { values: (string | null)[]; sum: number };

// The done-line sums of every stock key of the products. An answer that fills the limit may have dropped groups, so
// the products are halved; a single product is split by stock place, then a single place by the product's lots (read
// from the lots themselves, so their number is not capped, plus the lines whose lot is none of those), then a single lot
// by package (read from the packages), in chunks.
export const makeReadLedgerGroups = (
  query: LedgerGroupQuery,
  limit: number,
  readLotIds: (productId: string) => Promise<string[]>,
  readPackageIds: () => Promise<string[]>,
) => {
  const productOf = (conditions: Condition[]) => conditions.find((condition) => condition.dimension === 'product')?.values[0] ?? '';

  const readValues = async (
    side: 'in' | 'out',
    conditions: Condition[],
    dimension: LedgerDimension,
    values: (string | null)[],
    splits: LedgerDimension[],
  ): Promise<Group[]> => {
    const narrowed = [...conditions, { dimension, values }];
    const groups = await query({ side, conditions: narrowed, dimensions: KEY_DIMENSIONS, limit });

    if (groups.length < limit) {
      return groups;
    }
    if (values.length > 1) {
      const half = Math.ceil(values.length / 2);

      return [
        ...(await readValues(side, conditions, dimension, values.slice(0, half), splits)),
        ...(await readValues(side, conditions, dimension, values.slice(half), splits)),
      ];
    }
    const [next, ...rest] = splits;

    if (next === undefined) {
      throw new Error(
        `Product ${productOf(narrowed)} has more than ${limit} owners for one lot in one package in one place; the ledger check cannot read it.`,
      );
    }
    if (next === 'lot' || next === 'package') {
      const ids: (string | null)[] = [...(next === 'lot' ? await readLotIds(productOf(narrowed)) : await readPackageIds()), null];
      const chunked: Group[] = [];

      for (let start = 0; start < ids.length; start += ID_CHUNK) {
        chunked.push(...(await readValues(side, narrowed, next, ids.slice(start, start + ID_CHUNK), rest)));
      }

      if (next === 'lot') {
        // A done line may hold a lot that belongs to another product, which the product's own lots do not list.
        const foreign = await query({
          side,
          conditions: [...narrowed, { dimension: 'lot', values: ids, exclude: true }],
          dimensions: KEY_DIMENSIONS,
          limit,
        });

        if (foreign.length >= limit) {
          throw new Error(`Product ${productOf(narrowed)} has done lines in more than ${limit} lots of other products; the ledger check cannot read it.`);
        }
        chunked.push(...foreign);
      }
      return chunked;
    }
    const distinct = await query({ side, conditions: narrowed, dimensions: [next], limit });

    if (distinct.length >= limit) {
      throw new Error(`Product ${productOf(narrowed)} has done lines in more than ${limit} places; the ledger check cannot read it.`);
    }
    return readValues(side, narrowed, next, distinct.map((group) => group.values[0]), rest);
  };

  return (productIds: string[], side: 'in' | 'out') => readValues(side, [], 'product', productIds, ['location', 'lot', 'package']);
};
