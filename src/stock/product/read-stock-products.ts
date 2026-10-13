import { productProducts } from 'src/stock/stock-records';
import { PACKAGING_RESERVE_METHOD, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { type StockProduct } from 'src/stock/product/types/stock-product.type';
import { type PackagingReserveMethod } from 'src/stock/types/packaging-reserve-method.type';
import { type ProductTracking } from 'src/stock/types/product-tracking.type';

type VariantRead = {
  id: string;
  name: string | null;
  defaultCode: string | null;
  productTmpl: {
    id: string;
    name: string | null;
    productType: string;
    isStorable: boolean | null;
    tracking: ProductTracking | null;
    useExpirationDate: boolean | null;
    uomId: string;
    categId: string | null;
    descriptionPicking: string | null;
    descriptionPickingin: string | null;
    descriptionPickingout: string | null;
    propertyStockInventoryId: string | null;
    propertyStockProductionId: string | null;
    description: { markdown: string | null } | null;
    categ: { packagingReserveMethod: PackagingReserveMethod | null } | null;
  } | null;
};

// Twenty drops a relation nested under a to-one relation unless that relation
// also selects deletedAt.
const SELECTION = `id name defaultCode productTmpl {
  deletedAt id name productType isStorable tracking useExpirationDate uomId categId descriptionPicking descriptionPickingin descriptionPickingout
  propertyStockInventoryId propertyStockProductionId description { markdown } categ { packagingReserveMethod }
}`;

const textOrNull = (value: string | null | undefined) =>
  value === null || value === undefined || value.trim().length === 0 ? null : value;

// Archived variants and products are read too: their moves and quants still count.
export const readStockProducts = async (productIds: string[]) => {
  const ids = [...new Set(productIds)];
  const result = new Map<string, StockProduct>();

  if (ids.length === 0) {
    return result;
  }

  const variants = await productProducts.find<VariantRead>({ id: { in: ids } }, SELECTION);

  for (const variant of variants) {
    const template = variant.productTmpl;

    if (template === null) {
      continue;
    }

    result.set(variant.id, {
      productId: variant.id,
      templateId: template.id,
      displayName: variant.name ?? template.name ?? '',
      defaultCode: textOrNull(variant.defaultCode),
      templateName: template.name ?? '',
      productType: template.productType,
      isStorable: template.isStorable === true,
      tracking: template.tracking ?? PRODUCT_TRACKING.NONE,
      useExpirationDate: template.useExpirationDate === true,
      uomId: template.uomId,
      categId: template.categId,
      packagingReserveMethod: template.categ?.packagingReserveMethod ?? PACKAGING_RESERVE_METHOD.PARTIAL,
      descriptionPicking: textOrNull(template.descriptionPicking),
      descriptionPickingin: textOrNull(template.descriptionPickingin),
      descriptionPickingout: textOrNull(template.descriptionPickingout),
      propertyStockInventoryId: template.propertyStockInventoryId,
      propertyStockProductionId: template.propertyStockProductionId,
      templateDescription: textOrNull(template.description?.markdown),
    });
  }

  return result;
};
