import { type ProductWarranty } from 'src/fieldservice-equipment-stock/types/product-warranty.type';
import { WARRANTY_UNIT } from 'src/fieldservice/fieldservice-options.constant';

// The equipment shows the warranty length and unit of its product. Without a product, or with a product that has
// none, it shows no length. Returns only what differs from what the equipment holds.
export const planProductWarranty = ({
  equipment,
  product,
}: {
  equipment: { productWarranty: number | null; productWarrantyType: string | null };
  product: ProductWarranty | null;
}): { productWarranty?: number; productWarrantyType?: string } => {
  const length = product?.warranty ?? 0;
  const unit = product?.warrantyType ?? WARRANTY_UNIT.MONTH;
  const data: { productWarranty?: number; productWarrantyType?: string } = {};

  if ((equipment.productWarranty ?? 0) !== length) {
    data.productWarranty = length;
  }
  if ((equipment.productWarrantyType ?? WARRANTY_UNIT.MONTH) !== unit) {
    data.productWarrantyType = unit;
  }
  return data;
};
