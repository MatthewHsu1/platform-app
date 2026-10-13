import { resolveTree } from 'src/shared/utils/resolve-tree.util';
import { type CategoryRouteRow } from 'src/stock/utils/types/category-route-row.type';

type CategoryRoutesPlan = {
  creates: Omit<CategoryRouteRow, 'id'>[];
  updates: { id: string; inherited: boolean }[];
  destroys: string[];
};

// A category's total routes: its own (inherited false) and every ancestor's
// route it does not have itself (inherited true). Rebuilt for the given
// categories and every category under them.
export const planCategoryRoutes = ({
  categoryIds,
  categories,
  links,
  existing,
}: {
  categoryIds: string[];
  categories: { id: string; parentId: string | null }[];
  links: { productCategoryId: string; stockRouteId: string }[];
  existing: CategoryRouteRow[];
}): CategoryRoutesPlan => {
  const { chains } = resolveTree(categories);
  const asked = new Set(categoryIds);
  const plan: CategoryRoutesPlan = { creates: [], updates: [], destroys: [] };
  const routesOf = (categoryId: string) =>
    links.filter((link) => link.productCategoryId === categoryId).map((link) => link.stockRouteId);

  for (const [categoryId, chain] of chains) {
    if (!chain.some((ancestor) => asked.has(ancestor.id))) {
      continue;
    }
    const wanted = new Map<string, boolean>(routesOf(categoryId).map((routeId) => [routeId, false]));

    for (const ancestor of chain.slice(0, -1)) {
      for (const routeId of routesOf(ancestor.id)) {
        if (!wanted.has(routeId)) {
          wanted.set(routeId, true);
        }
      }
    }
    const kept = new Set<string>();

    for (const row of existing.filter((candidate) => candidate.productCategoryId === categoryId)) {
      const inherited = wanted.get(row.stockRouteId);

      if (inherited === undefined || kept.has(row.stockRouteId)) {
        plan.destroys.push(row.id);
        continue;
      }
      kept.add(row.stockRouteId);
      if (row.inherited !== inherited) {
        plan.updates.push({ id: row.id, inherited });
      }
    }
    for (const [stockRouteId, inherited] of wanted) {
      if (!kept.has(stockRouteId)) {
        plan.creates.push({ productCategoryId: categoryId, stockRouteId, inherited });
      }
    }
  }

  return plan;
};
