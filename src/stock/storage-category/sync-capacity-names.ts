import { findMany } from 'src/shared/triggers/records';
import { productProducts, stockPackageTypes, stockStorageCategoryCapacities } from 'src/stock/routing-records';
import { capacityName } from 'src/stock/utils/plan-routing-rows.util';

const isPresent = (id: string | null): id is string => id !== null;

// Writes "<product or package type>: <quantity>" on each capacity whose name is out of date.
export const syncCapacityNames = async (filter: Record<string, unknown>) => {
  const capacities = await stockStorageCategoryCapacities.find<{
    id: string;
    name: string | null;
    productId: string | null;
    packageTypeId: string | null;
    quantity: number | null;
  }>(filter, 'id name productId packageTypeId quantity');

  if (capacities.length === 0) {
    return;
  }
  const { products, packageTypes } = await findMany<{
    products: { id: string; name: string | null }[];
    packageTypes: { id: string; name: string | null }[];
  }>({
    products: {
      of: productProducts,
      filter: { id: { in: [...new Set(capacities.map((row) => row.productId).filter(isPresent))] } },
      selection: 'id name',
    },
    packageTypes: {
      of: stockPackageTypes,
      filter: { id: { in: [...new Set(capacities.map((row) => row.packageTypeId).filter(isPresent))] } },
      selection: 'id name',
    },
  });

  for (const capacity of capacities) {
    const name = capacityName({
      productName: products.find((product) => product.id === capacity.productId)?.name ?? null,
      packageTypeName: packageTypes.find((packageType) => packageType.id === capacity.packageTypeId)?.name ?? null,
      quantity: capacity.quantity ?? 0,
    });

    if (name !== capacity.name) {
      await stockStorageCategoryCapacities.update(capacity.id, { name });
    }
  }
};
