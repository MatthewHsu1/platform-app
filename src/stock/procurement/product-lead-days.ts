import { readRoutingData } from 'src/stock/procurement/read-routing-data';
import { leadDays } from 'src/stock/utils/procurement/lead-days.util';
import { EndlessRuleLoopError, rulesFromLocation } from 'src/stock/utils/procurement/rules-from-location.util';
import { type LeadDays } from 'src/stock/utils/procurement/types/lead-days.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';

const supplyingRules = (product: RoutingProduct, locationId: string, data: RoutingData) => {
  try {
    return rulesFromLocation({ product, locationId }, data);
  } catch (error) {
    // A looping chain of rules has no lead time to show; ordering reports the loop.
    if (error instanceof EndlessRuleLoopError) {
      return [];
    }
    throw error;
  }
};

// Per product, the lead time of the pull rules that supply a location: the
// time a replenishment ordered today takes to arrive there.
export const productsLeadDays = async ({
  productIds,
  locationId,
  horizonDays,
}: {
  productIds: string[];
  locationId: string;
  horizonDays: number;
}): Promise<Map<string, LeadDays>> => {
  if (productIds.length === 0) {
    return new Map();
  }
  const { data, products } = await readRoutingData(productIds);

  return new Map(
    productIds.map((productId) => {
      const product = products.get(productId);

      return [productId, leadDays(product === undefined ? [] : supplyingRules(product, locationId, data), horizonDays)];
    }),
  );
};
