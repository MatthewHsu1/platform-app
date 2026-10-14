import { type ProductWarranty } from 'src/fieldservice-equipment-stock/types/product-warranty.type';
import { planProductWarranty } from 'src/fieldservice-equipment-stock/utils/plan-product-warranty.util';
import { fsmEquipments } from 'src/fieldservice/fieldservice-records';
import { productProducts } from 'src/product/variant/product-records';
import { writeGrouped } from 'src/shared/triggers/write-grouped';

type EquipmentRow = { id: string; productId: string | null; productWarranty: number | null; productWarrantyType: string | null };
type ProductRow = { id: string; productTmpl: ProductWarranty | null };

// The one writer of the warranty length and unit an equipment shows. Name the equipment, or the product templates
// whose warranty changed. A write that changes the length or unit makes the equipment save rule set the end again.
export const copyProductWarranty = async ({ equipmentIds = [], templateIds = [] }: { equipmentIds?: string[]; templateIds?: string[] }) => {
  if (equipmentIds.length === 0 && templateIds.length === 0) {
    return;
  }
  const ofTemplates = await productProducts.find<{ id: string }>({ productTmplId: { in: templateIds } }, 'id');
  const equipments = await fsmEquipments.find<EquipmentRow>(
    { or: [{ id: { in: equipmentIds } }, { productId: { in: ofTemplates.map((product) => product.id) } }] },
    'id productId productWarranty productWarrantyType',
  );
  const products = await productProducts.find<ProductRow>(
    { id: { in: [...new Set(equipments.flatMap((equipment) => equipment.productId ?? []))] } },
    'id productTmpl { warranty warrantyType }',
  );
  const templateOf = new Map(products.map((product) => [product.id, product.productTmpl]));

  await writeGrouped(
    fsmEquipments,
    equipments.flatMap((equipment) => {
      const data = planProductWarranty({
        equipment,
        product: equipment.productId === null ? null : (templateOf.get(equipment.productId) ?? null),
      });

      return Object.keys(data).length === 0 ? [] : [{ id: equipment.id, data }];
    }),
  );
};
