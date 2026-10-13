import { productProducts } from 'src/stock/stock-records';
import { type ExpiryTimes } from 'src/product-expiry/utils/types/expiry-times.type';

type VariantExpiryRow = {
  id: string;
  productTmpl: {
    useExpirationDate: boolean | null;
    expirationTime: number | null;
    useTime: number | null;
    removalTime: number | null;
    alertTime: number | null;
  } | null;
};

// By variant id.
export const readExpiryTimes = async (productIds: string[]): Promise<Map<string, ExpiryTimes>> => {
  const rows = await productProducts.find<VariantExpiryRow>(
    { id: { in: [...new Set(productIds)] } },
    'id productTmpl { useExpirationDate expirationTime useTime removalTime alertTime }',
  );

  return new Map(
    rows.map((row) => [
      row.id,
      {
        useExpirationDate: row.productTmpl?.useExpirationDate === true,
        expirationTime: row.productTmpl?.expirationTime ?? 0,
        useTime: row.productTmpl?.useTime ?? 0,
        removalTime: row.productTmpl?.removalTime ?? 0,
        alertTime: row.productTmpl?.alertTime ?? 0,
      },
    ]),
  );
};
