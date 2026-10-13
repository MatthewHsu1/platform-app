import { findMany } from 'src/shared/triggers/records';
import { productCategories, productProducts, stockLocations, stockPutawayRules } from 'src/stock/routing-records';
import { isLocationUnder } from 'src/stock/utils/location-usage.util';
import { planPutawayRuleSync } from 'src/stock/utils/plan-routing-rows.util';
import { type PutawayRuleRow } from 'src/stock/utils/types/putaway-rule-row.type';

type StoredRule = PutawayRuleRow & { id: string; productId: string | null; categoryId: string | null };

const isPresent = (id: string | null): id is string => id !== null;

// Writes each putaway rule's name, storage category and store-to location as
// its fields want them. `locationInChanged` names the rules a user just moved.
export const syncPutawayRules = async (filter: Record<string, unknown>, locationInChanged: Set<string> = new Set()) => {
  const rules = await stockPutawayRules.find<StoredRule>(
    filter,
    'id name productId categoryId locationInId locationOutId storageCategoryId sublocation',
  );

  if (rules.length === 0) {
    return;
  }
  const { products, categories, locations } = await findMany<{
    products: { id: string; name: string | null }[];
    categories: { id: string; name: string | null }[];
    locations: { id: string; name: string; completeName: string | null; parentPath: string | null }[];
  }>({
    products: {
      of: productProducts,
      filter: { id: { in: [...new Set(rules.map((rule) => rule.productId).filter(isPresent))] } },
      selection: 'id name',
    },
    categories: {
      of: productCategories,
      filter: { id: { in: [...new Set(rules.map((rule) => rule.categoryId).filter(isPresent))] } },
      selection: 'id name',
    },
    locations: {
      of: stockLocations,
      filter: { id: { in: [...new Set(rules.flatMap((rule) => [rule.locationInId, rule.locationOutId]).filter(isPresent))] } },
      selection: 'id name completeName parentPath',
    },
  });
  const locationOf = (id: string | null) => (id === null ? undefined : locations.find((candidate) => candidate.id === id));
  const fullName = (id: string | null) => {
    const found = locationOf(id);

    return found === undefined ? '' : (found.completeName ?? found.name);
  };

  for (const rule of rules) {
    const label =
      products.find((product) => product.id === rule.productId)?.name ??
      categories.find((category) => category.id === rule.categoryId)?.name ??
      'All products';
    const values = planPutawayRuleSync({
      rule,
      locationInChanged: locationInChanged.has(rule.id),
      label,
      locationInName: fullName(rule.locationInId),
      locationOutName: fullName(rule.locationOutId),
      isLocationOutUnderIn: isLocationUnder(
        locationOf(rule.locationOutId)?.parentPath ?? null,
        locationOf(rule.locationInId)?.parentPath ?? null,
      ),
    });

    await stockPutawayRules.update(rule.id, values);
  }
};
