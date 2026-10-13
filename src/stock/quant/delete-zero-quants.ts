import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { stockQuants } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { emptyQuantFilter, planZeroQuantCleanup } from 'src/stock/utils/plan-zero-quant-cleanup.util';
import { type CleanupQuant } from 'src/stock/utils/types/cleanup-quant.type';

// Twenty's MUTATION_MAXIMUM_AFFECTED_RECORDS default.
const DESTROY_CHUNK = 100;

// The filter is checked inside the delete itself (the same filtered mutation as the
// compare-and-set update), so a row that took stock or a count since it was read stays.
export const destroyEmptyQuants = async (ids: string[], productUnitDigits: number) => {
  for (let start = 0; start < ids.length; start += DESTROY_CHUNK) {
    requireData(
      await twentyGraphql(
        'application',
        `mutation DestroyEmptyQuants($filter: StockQuantFilterInput!) { destroyStockQuants(filter: $filter) { id } }`,
        {
          filter: {
            and: [{ id: { in: ids.slice(start, start + DESTROY_CHUNK) } }, emptyQuantFilter(productUnitDigits)],
          },
        },
      ),
      'Destroy empty stock rows',
    );
  }
};

// The rows of these keys left with nothing go now, by the rule of the nightly clean-up, so stock taken out of a
// package does not leave empty rows behind in it.
export const deleteZeroQuants = async (keys: string[]) => {
  const wanted = [...new Set(keys)];

  if (wanted.length === 0) {
    return;
  }
  const { productUnitDigits } = readStockSettings();
  const quants = await stockQuants.find<Omit<CleanupQuant, 'quantity'> & { quantity: number | null }>(
    { quantKey: { in: wanted } },
    'id quantity reservedQuantity inventoryQuantity assignedUserId',
  );
  const ids = planZeroQuantCleanup({ quants: quants.map((quant) => ({ ...quant, quantity: quant.quantity ?? 0 })), productUnitDigits });

  await destroyEmptyQuants(ids, productUnitDigits);
};
