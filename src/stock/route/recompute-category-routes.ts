import { findMany } from 'src/shared/triggers/records';
import { recomputeOrderpointsOfCategories } from 'src/stock/orderpoint/orderpoint-recompute-triggers';
import { productCategories, stockRouteCategs, stockRouteCategTotals } from 'src/stock/routing-records';
import { planCategoryRoutes } from 'src/stock/utils/plan-category-routes.util';
import { type CategoryRouteRow } from 'src/stock/utils/types/category-route-row.type';

// Rebuilds the total-route rows of the categories and every category under
// them; the reordering rules of a category whose routes changed are recomputed.
export const recomputeCategoryRoutes = async (categoryIds: string[]) => {
  if (categoryIds.length === 0) {
    return;
  }
  const { categories, links, totals } = await findMany<{
    categories: { id: string; parentId: string | null }[];
    links: { productCategoryId: string; stockRouteId: string }[];
    totals: CategoryRouteRow[];
  }>({
    categories: { of: productCategories, filter: {}, selection: 'id parentId' },
    links: { of: stockRouteCategs, filter: {}, selection: 'productCategoryId stockRouteId' },
    totals: { of: stockRouteCategTotals, filter: {}, selection: 'id productCategoryId stockRouteId inherited' },
  });
  const plan = planCategoryRoutes({ categoryIds: [...new Set(categoryIds)], categories, links, existing: totals });

  if (plan.destroys.length > 0) {
    await stockRouteCategTotals.destroyMany(plan.destroys);
  }
  for (const inherited of [true, false]) {
    const ids = plan.updates.filter((update) => update.inherited === inherited).map((update) => update.id);

    if (ids.length > 0) {
      await stockRouteCategTotals.updateMany(ids, { inherited });
    }
  }
  if (plan.creates.length > 0) {
    await stockRouteCategTotals.createMany(plan.creates);
  }
  const categoryOfRow = new Map(totals.map((row) => [row.id, row.productCategoryId]));

  await recomputeOrderpointsOfCategories([
    ...new Set([
      ...plan.creates.map((row) => row.productCategoryId),
      ...[...plan.destroys, ...plan.updates.map((update) => update.id)].flatMap((id) => categoryOfRow.get(id) ?? []),
    ]),
  ]);
};
