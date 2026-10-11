import { RemovalStrategyNotImplementedError } from 'src/stock/removal/removal-order';
import { productCategories, productRemovals, stockLocations } from 'src/stock/routing-records';
import { StockUserError } from 'src/stock/stock-errors';
import { type RemovalMethod } from 'src/stock/removal/types/removal-method.type';

type StrategyHolder = { id: string; removalStrategyId: string | null };

const pathIds = (parentPath: string | null) => (parentPath ?? '').split('/').filter((id) => id !== '');

// The forced strategy of each category and of every location on the given paths.
export const readRemovalMethods = async ({
  categoryIds,
  parentPaths,
}: {
  categoryIds: string[];
  parentPaths: (string | null)[];
}) => {
  const [categories, locations] = await Promise.all([
    productCategories.find<StrategyHolder>({ id: { in: [...new Set(categoryIds)] } }, 'id removalStrategyId'),
    stockLocations.find<StrategyHolder>({ id: { in: [...new Set(parentPaths.flatMap(pathIds))] } }, 'id removalStrategyId'),
  ]);
  const strategyIds = [
    ...new Set([...categories, ...locations].flatMap((row) => (row.removalStrategyId === null ? [] : [row.removalStrategyId]))),
  ];
  const strategies = await productRemovals.find<{ id: string; method: RemovalMethod }>({ id: { in: strategyIds } }, 'id method');
  const methodById = new Map(strategies.map((row) => [row.id, row.method]));
  const methodOf = (strategyId: string | null) => (strategyId === null ? null : (methodById.get(strategyId) ?? null));
  const locationMethods = new Map(locations.map((row) => [row.id, methodOf(row.removalStrategyId)]));
  const categoryMethods = new Map(categories.map((row) => [row.id, methodOf(row.removalStrategyId)]));

  return {
    categoryMethodOf: (categoryId: string | null) => (categoryId === null ? null : (categoryMethods.get(categoryId) ?? null)),
    // The location itself first, then each parent up to the root.
    chainOf: (parentPath: string | null) =>
      pathIds(parentPath)
        .reverse()
        .map((id) => locationMethods.get(id) ?? null),
  };
};

// An unknown strategy refuses the button with its message.
export const withRemovalRefusal = <TResult>(run: () => TResult): TResult => {
  try {
    return run();
  } catch (error) {
    if (error instanceof RemovalStrategyNotImplementedError) {
      throw new StockUserError('Removal strategy {method} not implemented.', { method: error.method });
    }
    throw error;
  }
};
