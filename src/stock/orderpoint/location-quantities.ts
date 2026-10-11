import { type LocationStock } from 'src/stock/orderpoint/types/location-stock.type';
import { quantitiesUpTo } from 'src/stock/orderpoint/utils/location-quantities.util';
import { productProducts, stockLocations, stockMoves, stockQuants } from 'src/stock/stock-records';
import { OPEN_MOVE_STATES_FOR_FORECAST } from 'src/stock/utils/plan-product-quantities.util';

// The location and every location under it, archived ones too.
export const readSubtreeIds = async (locationId: string) => {
  const [location] = await stockLocations.find<{ parentPath: string | null }>({ id: { eq: locationId } }, 'parentPath');

  if (location === undefined || location.parentPath === null) {
    return new Set([locationId]);
  }
  const subtree = await stockLocations.find<{ id: string }>({ parentPath: { like: `${location.parentPath}%` } }, 'id');

  return new Set([locationId, ...subtree.map((row) => row.id)]);
};

export const readLocationStock = async ({
  productIds,
  locationId,
}: {
  productIds: string[];
  locationId: string;
}): Promise<LocationStock> => {
  const scopeLocationIds = await readSubtreeIds(locationId);
  const scopeIds = [...scopeLocationIds];
  const [quants, moves, variants] = await Promise.all([
    stockQuants.find<LocationStock['quants'][number]>(
      { productId: { in: productIds }, locationId: { in: scopeIds } },
      'productId locationId quantity reservedQuantity removalDate',
    ),
    stockMoves.find<LocationStock['moves'][number]>(
      {
        productId: { in: productIds },
        state: { in: OPEN_MOVE_STATES_FOR_FORECAST },
        or: [{ locationId: { in: scopeIds } }, { locationDestId: { in: scopeIds } }, { locationFinalId: { in: scopeIds } }],
      },
      'productId state productQty locationId locationDestId locationFinalId date',
    ),
    productProducts.find<{ id: string; productTmplId: string; productTmpl: { productType: string } | null }>(
      { id: { in: productIds } },
      'id productTmplId productTmpl { deletedAt productType }',
    ),
  ]);

  return {
    products: variants.map((variant) => ({
      id: variant.id,
      templateId: variant.productTmplId,
      productType: variant.productTmpl?.productType ?? '',
    })),
    scopeLocationIds,
    quants,
    moves,
  };
};

// On hand and forecast of products at one location (and below) for each asked
// end day; null = no end day.
export const readLocationQuantities = async ({
  productIds,
  locationId,
  toDays,
  digits,
}: {
  productIds: string[];
  locationId: string;
  toDays: (string | null)[];
  digits: number;
}) => {
  const stock = await readLocationStock({ productIds, locationId });
  const now = new Date();

  return new Map(toDays.map((toDay) => [toDay, quantitiesUpTo(stock, { toDay, digits, now })]));
};
