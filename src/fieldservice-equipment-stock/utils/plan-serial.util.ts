import { type SerialPlan } from 'src/fieldservice-equipment-stock/types/serial-plan.type';

// The serial of equipment is a lot of its product, and no two live equipment share a serial. A new equipment that
// breaks either rule loses its serial; a changed one gets the product and serial it had back. Where the serial is
// both another product's and taken, the product is the reason given. An equipment without a product, a serial
// without a product and a blank serial pass.
export const planSerial = ({
  productId,
  lotId,
  lotProductId,
  otherEquipmentWithLot,
  isCreate,
  updatedProduct,
  updatedLot,
  before,
}: {
  productId: string | null;
  lotId: string | null;
  lotProductId: string | null;
  otherEquipmentWithLot: boolean;
  isCreate: boolean;
  updatedProduct: boolean;
  updatedLot: boolean;
  before: { productId: string | null; lotId: string | null };
}): SerialPlan => {
  if (lotId === null) {
    return { kind: 'keep' };
  }
  const otherProduct = productId !== null && lotProductId !== null && lotProductId !== productId;
  const taken = otherEquipmentWithLot && (isCreate || updatedLot);

  if (!otherProduct && !taken) {
    return { kind: 'keep' };
  }
  const data: { productId?: string | null; lotId?: string | null } = isCreate ? { lotId: null } : {};

  if (!isCreate && updatedLot) {
    data.lotId = before.lotId;
  }
  if (!isCreate && otherProduct && updatedProduct) {
    data.productId = before.productId;
  }
  return { kind: 'putBack', reason: otherProduct ? 'serialOfOtherProduct' : 'serialTaken', data };
};
