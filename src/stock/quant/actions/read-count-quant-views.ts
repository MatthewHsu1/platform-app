import { readLocations } from 'src/stock/location/read-locations';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { type CountQuantView } from 'src/stock/quant/types/count-quant-view.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

export const readCountQuantViews = async (quants: QuantRow[]): Promise<CountQuantView[]> => {
  const products = await readStockProducts([...new Set(quants.map((quant) => quant.productId))]);
  const locations = await readLocations(quants.map((quant) => quant.locationId));

  return quants.map((quant) => {
    const location = locations.get(quant.locationId);

    return {
      id: quant.id,
      productName: products.get(quant.productId)?.displayName ?? '',
      locationName: location?.completeName ?? location?.name ?? '',
      counted: quant.inventoryQuantity ?? 0,
      onHand: quant.quantity,
      difference: quant.inventoryDiffQuantity ?? 0,
    };
  });
};
